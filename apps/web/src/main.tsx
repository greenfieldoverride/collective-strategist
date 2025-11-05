import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './theme.css'
import './styles/impact-dashboard.css'
import './styles/user-profile.css'
import './styles/content-studio.css'
import './styles/social-media-hub.css'
import './styles/calendar-hub.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)