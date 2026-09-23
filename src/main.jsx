import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './caonabo35'

// Prerendered pages (scripts/prerender.mjs) tag #root with data-lang / data-page; the dev server and
// any untagged shell fall back to the URL. createRoot (not hydrate) replaces the static markup.
const root = document.getElementById('root')
const path = window.location.pathname.replace(/\/+$/, '') || '/'
const initialLang = root.dataset.lang || (/^\/en(\/|$)/.test(path) ? 'en' : 'es')
const initialPage = root.dataset.page || (/^\/(habitaciones|en\/rooms)$/.test(path) ? 'rooms' : 'home')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App initialLang={initialLang} initialPage={initialPage} />
  </React.StrictMode>
)
