import { HIGHLIGHT_COLOR_HEX } from '@highlighter/shared'

import { formatRelativeTime } from './formatRelativeTime'
import { usePageHighlights } from './hooks/usePageHighlights'

export function Popup() {
  const { highlights, isLoading, error, scrollTo, remove } = usePageHighlights()

  return (
    <main className="popup">
      <header className="popup__header">
        <h1 className="popup__title">Highlighter</h1>
        {!isLoading && !error && (
          <span className="popup__count">이 페이지에서 {highlights.length}개</span>
        )}
      </header>

      {isLoading && <p className="popup__message">불러오는 중입니다.</p>}

      {error && <p className="popup__message popup__message--error">{error}</p>}

      {!isLoading && !error && highlights.length === 0 && (
        <p className="popup__message">
          문장을 선택한 뒤 <kbd>option</kbd> + <kbd>S</kbd> 를 누르면 하이라이트됩니다.
        </p>
      )}

      {highlights.length > 0 && (
        <ul className="popup__list">
          {highlights.map((highlight) => (
            <li key={highlight.id} className="popup__item">
              <button
                type="button"
                className="popup__quote"
                style={{ borderLeftColor: HIGHLIGHT_COLOR_HEX[highlight.color] }}
                onClick={() => scrollTo(highlight.id)}
              >
                <span className="popup__text">{highlight.text}</span>
                <time className="popup__time" dateTime={highlight.createdAt}>
                  {formatRelativeTime(highlight.createdAt)}
                </time>
              </button>
              <button
                type="button"
                className="popup__remove"
                aria-label="하이라이트 지우기"
                onClick={() => void remove(highlight.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="popup__footer">
        단축키가 겹치면{' '}
        <code>chrome://extensions/shortcuts</code> 에서 바꿀 수 있습니다.
      </footer>
    </main>
  )
}
