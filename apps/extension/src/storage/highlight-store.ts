import {
  type Highlight,
  type HighlightColor,
  type HighlightDraft,
  highlightDraftSchema,
  highlightSchema,
} from '@highlighter/shared'
import { z } from 'zod'

import { chromeStorageAdapter, type StorageAdapter } from './adapter'
import { INDEX_KEY, isPageKey, pageKey, STORAGE_SCHEMA_VERSION, urlFromPageKey } from './keys'

const pageRecordSchema = z.object({
  version: z.number().int().positive(),
  highlights: z.array(highlightSchema),
})

const pageSummarySchema = z.object({
  url: z.string().min(1),
  title: z.string(),
  host: z.string(),
  count: z.number().int().nonnegative(),
  updatedAt: z.string(),
})

const indexRecordSchema = z.object({
  version: z.number().int().positive(),
  pages: z.array(pageSummarySchema),
})

export type PageSummary = z.infer<typeof pageSummarySchema>

export interface HighlightStore {
  add(draft: HighlightDraft): Promise<Highlight>
  listByUrl(url: string): Promise<Highlight[]>
  listPages(): Promise<PageSummary[]>
  remove(url: string, id: string): Promise<void>
  updateColor(url: string, id: string, color: HighlightColor): Promise<void>
  rebuildIndex(): Promise<void>
}

const summarize = (url: string, highlights: readonly Highlight[]): PageSummary | null => {
  const latest = highlights.at(-1)

  if (!latest) {
    return null
  }

  return {
    url,
    title: latest.pageTitle,
    host: latest.siteHost,
    count: highlights.length,
    updatedAt: latest.createdAt,
  }
}

export function createHighlightStore(
  adapter: StorageAdapter = chromeStorageAdapter,
): HighlightStore {
  /**
   * chrome.storage 는 읽고 고쳐서 다시 쓰는 방식이라, 동시에 부르면 갱신이 유실된다.
   * 또한 페이지 데이터와 색인이 어긋나면 안 되므로 두 쓰기를 한 작업으로 묶는다.
   */
  let queue: Promise<unknown> = Promise.resolve()

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task, task)
    queue = result.catch(() => undefined)
    return result
  }

  const readPage = async (url: string): Promise<Highlight[]> => {
    const parsed = pageRecordSchema.safeParse(await adapter.get(pageKey(url)))

    return parsed.success ? parsed.data.highlights : []
  }

  const readIndex = async (): Promise<PageSummary[]> => {
    const parsed = indexRecordSchema.safeParse(await adapter.get(INDEX_KEY))

    return parsed.success ? parsed.data.pages : []
  }

  const writePage = async (url: string, highlights: readonly Highlight[]): Promise<void> => {
    if (highlights.length === 0) {
      await adapter.remove(pageKey(url))
      return
    }

    await adapter.set(pageKey(url), {
      version: STORAGE_SCHEMA_VERSION,
      highlights,
    })
  }

  const writeIndexEntry = async (url: string, highlights: readonly Highlight[]): Promise<void> => {
    const others = (await readIndex()).filter((page) => page.url !== url)
    const summary = summarize(url, highlights)

    await adapter.set(INDEX_KEY, {
      version: STORAGE_SCHEMA_VERSION,
      pages: summary ? [...others, summary] : others,
    })
  }

  /** 페이지 데이터와 색인을 한 작업 안에서 함께 갱신한다. */
  const commit = async (url: string, highlights: readonly Highlight[]): Promise<void> => {
    await writePage(url, highlights)
    await writeIndexEntry(url, highlights)
  }

  return {
    async add(draft) {
      const validated = highlightDraftSchema.safeParse(draft)

      if (!validated.success) {
        throw new Error('하이라이트 형식이 올바르지 않습니다.', { cause: validated.error })
      }

      const highlight: Highlight = {
        ...validated.data,
        id: crypto.randomUUID(),
        userId: null,
        createdAt: new Date().toISOString(),
      }

      return enqueue(async () => {
        await commit(highlight.url, [...(await readPage(highlight.url)), highlight])
        return highlight
      })
    },

    async listByUrl(url) {
      return readPage(url)
    },

    async listPages() {
      return readIndex()
    },

    async remove(url, id) {
      await enqueue(async () => {
        const remaining = (await readPage(url)).filter((highlight) => highlight.id !== id)
        await commit(url, remaining)
      })
    },

    async updateColor(url, id, color) {
      await enqueue(async () => {
        const updated = (await readPage(url)).map((highlight) =>
          highlight.id === id ? { ...highlight, color } : highlight,
        )
        await commit(url, updated)
      })
    },

    async rebuildIndex() {
      await enqueue(async () => {
        const pageKeys = (await adapter.keys()).filter(isPageKey)

        const summaries = await Promise.all(
          pageKeys.map(async (key) => {
            const url = urlFromPageKey(key)
            return summarize(url, await readPage(url))
          }),
        )

        await adapter.set(INDEX_KEY, {
          version: STORAGE_SCHEMA_VERSION,
          pages: summaries.filter((summary) => summary !== null),
        })
      })
    },
  }
}
