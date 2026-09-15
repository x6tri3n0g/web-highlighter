import { HIGHLIGHT_COLOR_HEX, HIGHLIGHT_COLOR_LABEL, HIGHLIGHT_COLORS } from '@highlighter/shared'

export function Popup() {
  return (
    <main className="popup">
      <header className="popup__header">
        <h1 className="popup__title">Highlighter</h1>
      </header>

      <section className="popup__section">
        <p className="popup__hint">
          문장을 선택한 뒤 <kbd>option</kbd> + <kbd>S</kbd> 를 누르면 하이라이트됩니다.
        </p>
      </section>

      <section className="popup__section">
        <h2 className="popup__subtitle">색상</h2>
        <ul className="popup__colors">
          {HIGHLIGHT_COLORS.map((color) => (
            <li key={color}>
              <span
                className="popup__swatch"
                style={{ backgroundColor: HIGHLIGHT_COLOR_HEX[color] }}
                aria-hidden="true"
              />
              <span className="popup__swatch-label">{HIGHLIGHT_COLOR_LABEL[color]}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
