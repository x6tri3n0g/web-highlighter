import { HIGHLIGHT_COLOR_HEX, HIGHLIGHT_COLORS } from '@highlighter/shared'

const swatchRules = HIGHLIGHT_COLORS.map(
  (color) => `.swatch[data-color="${color}"] { background: ${HIGHLIGHT_COLOR_HEX[color]}; }`,
).join('\n')

/** Shadow DOM 안에서만 적용되므로 페이지의 CSS 와 서로 간섭하지 않는다. */
export const POPOVER_STYLES = `
:host {
  all: initial;
}

.popover {
  align-items: center;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  box-sizing: border-box;
  display: flex;
  gap: 6px;
  left: 0;
  padding: 6px 8px;
  position: fixed;
  top: 0;
  z-index: 2147483647;
}

.swatch,
.remove {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  cursor: pointer;
  height: 20px;
  padding: 0;
  transition: transform 120ms ease;
  width: 20px;
}

.swatch:hover,
.remove:hover {
  transform: scale(1.15);
}

.swatch[aria-pressed="true"] {
  box-shadow: 0 0 0 2px #1f1f1f;
}

.remove {
  background: transparent;
  border-color: transparent;
  font-size: 13px;
  line-height: 1;
  margin-left: 2px;
}

.divider {
  background: rgba(0, 0, 0, 0.1);
  height: 16px;
  width: 1px;
}

${swatchRules}
`
