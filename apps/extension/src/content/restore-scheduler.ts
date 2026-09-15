import type { Highlight } from '@highlighter/shared'

import { restoreMissing } from './restore'

/** 본문이 잇달아 바뀔 때 매번 복원하지 않도록 잠시 모아서 처리한다. */
const DEBOUNCE_MS = 200

const OBSERVER_OPTIONS: MutationObserverInit = { childList: true, subtree: true }

export interface RestoreScheduler {
  start(): void
  stop(): void
  runNow(): Promise<void>
}

export interface RestoreSchedulerOptions {
  readonly loadHighlights: () => Promise<readonly Highlight[]>
  readonly onRestored?: (restored: number, failed: number) => void
  readonly target?: Node
}

/**
 * 사이트가 본문을 다시 그려도 하이라이트가 살아남게 한다.
 *
 * 브런치나 벨로그처럼 자바스크립트로 본문을 나중에 채우는 사이트에서는
 * document_idle 시점에 한 번 복원하는 것으로는 부족하다. 복원한 직후에
 * 사이트가 본문을 갈아 끼우면 mark 도 함께 사라지기 때문이다.
 */
export function createRestoreScheduler({
  loadHighlights,
  onRestored,
  target = document.body,
}: RestoreSchedulerOptions): RestoreScheduler {
  let observer: MutationObserver | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let isRestoring = false

  const runNow = async (): Promise<void> => {
    if (isRestoring) {
      return
    }

    isRestoring = true
    // 우리가 mark 를 칠하면서 일으킨 변화를 다시 처리하지 않도록 관찰을 끊는다.
    // disconnect 는 아직 처리하지 않은 기록도 함께 버린다.
    observer?.disconnect()

    try {
      const report = restoreMissing(await loadHighlights())

      if (report.restored > 0 || report.failed > 0) {
        onRestored?.(report.restored, report.failed)
      }
    } catch (error) {
      console.warn('하이라이트를 복원하지 못했습니다.', error)
    } finally {
      isRestoring = false
      observer?.observe(target, OBSERVER_OPTIONS)
    }
  }

  const schedule = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      timer = null
      void runNow()
    }, DEBOUNCE_MS)
  }

  return {
    start() {
      observer ??= new MutationObserver(schedule)
      observer.observe(target, OBSERVER_OPTIONS)
    },

    stop() {
      observer?.disconnect()
      observer = null

      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    },

    runNow,
  }
}
