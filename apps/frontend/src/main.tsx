import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { MobileApp } from './components/layout/MobileApp'
import { isNativeApp } from './lib/platform'
import { ToastProvider } from './components/ui/ToastProvider'
import './index.css'

if (isNativeApp) {
  document.documentElement.classList.add('mobile-app')
  const viewport = document.querySelector('meta[name="viewport"]')
  viewport?.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, viewport-fit=cover',
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        {isNativeApp ? (
          <MobileApp>
            <App />
          </MobileApp>
        ) : (
          <App />
        )}
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
