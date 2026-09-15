import { HIGHLIGHT_COLOR_HEX, HIGHLIGHT_COLOR_LABEL, HIGHLIGHT_COLORS } from '@highlighter/shared'

export default function HomePage() {
  return (
    <main className="shell">
      <h1 className="shell__title">Highlighter</h1>
      <p className="shell__description">
        익스텐션에서 남긴 하이라이트를 날짜별로 모아서 보여줄 자리입니다.
      </p>

      <ul className="shell__colors">
        {HIGHLIGHT_COLORS.map((color) => (
          <li key={color} className="shell__color">
            <span className="shell__swatch" style={{ backgroundColor: HIGHLIGHT_COLOR_HEX[color] }} />
            {HIGHLIGHT_COLOR_LABEL[color]}
          </li>
        ))}
      </ul>
    </main>
  )
}
