import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { Popup } from './Popup'
import './popup.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('팝업을 붙일 root 엘리먼트를 찾지 못했습니다.')
}

createRoot(container).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
)
