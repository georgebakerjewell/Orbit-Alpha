import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Guide pages arrive as finished HTML from the build (scripts/guides.mjs). Keep a copy before React
// replaces the page, so the app can show it without fetching it again.
const guide = document.querySelector('#root .oa-guide');
(window as any).__oaGuide = guide ? { path: window.location.pathname.replace(/\/$/, '') || '/', html: guide.innerHTML } : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
