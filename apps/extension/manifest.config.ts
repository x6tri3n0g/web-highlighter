import { defineManifest } from '@crxjs/vite-plugin'

import packageJson from './package.json' with { type: 'json' }

/** macOS 에서 Alt 는 option 키에 대응하므로, option + s 는 Alt+S 로 등록한다. */
const HIGHLIGHT_SHORTCUT = 'Alt+S'

export default defineManifest({
  manifest_version: 3,
  name: 'Highlighter',
  version: packageJson.version,
  description: '읽고 있는 글에서 마음에 든 문장을 단축키로 하이라이트합니다.',
  permissions: ['storage', 'activeTab', 'scripting'],
  host_permissions: ['<all_urls>'],
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Highlighter',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  commands: {
    'highlight-selection': {
      suggested_key: {
        default: HIGHLIGHT_SHORTCUT,
        mac: HIGHLIGHT_SHORTCUT,
      },
      description: '선택한 문장을 하이라이트합니다',
    },
  },
})
