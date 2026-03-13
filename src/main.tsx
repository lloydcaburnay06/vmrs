import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { apiBaseFallbackPrefixes, apiBasePrefix, appBasePath } from './config'

const originalFetch = window.fetch.bind(window)

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input !== 'string' && !(input instanceof URL)) {
    return originalFetch(input, init)
  }

  const requestUrl = new URL(typeof input === 'string' ? input : input.toString(), window.location.origin)

  if (requestUrl.origin !== window.location.origin) {
    return originalFetch(input, init)
  }

  const apiSegmentIndex = requestUrl.pathname.indexOf('/api/')
  if (apiSegmentIndex === -1) {
    return originalFetch(input, init)
  }

  const primaryResponse = await originalFetch(input, init)
  if (primaryResponse.status !== 404) {
    return primaryResponse
  }

  const apiSuffix = requestUrl.pathname.slice(apiSegmentIndex)
  const attemptedPrefixes = new Set([
    requestUrl.pathname.slice(0, apiSegmentIndex),
    apiBasePrefix,
  ])

  for (const fallbackPrefix of apiBaseFallbackPrefixes) {
    if (attemptedPrefixes.has(fallbackPrefix)) {
      continue
    }

    const fallbackUrl = new URL(requestUrl.toString())
    fallbackUrl.pathname = `${fallbackPrefix}${apiSuffix}`.replace(/\/{2,}/g, '/')

    const fallbackResponse = await originalFetch(fallbackUrl.toString(), init)
    if (fallbackResponse.status !== 404) {
      return fallbackResponse
    }
  }

  return primaryResponse
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={appBasePath}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
