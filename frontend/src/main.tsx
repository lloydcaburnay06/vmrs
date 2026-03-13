import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

const path = window.location.pathname
const adminMarker = '/admin'
const markerIndex = path.indexOf(adminMarker)
const basename = markerIndex >= 0 ? path.slice(0, markerIndex + adminMarker.length) : adminMarker

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
