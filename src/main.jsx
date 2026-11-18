import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { WorkspaceProvider } from './context/WorkspaceProvider.jsx'
import { PreferencesProvider } from './context/PreferencesProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PreferencesProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </AuthProvider>
    </PreferencesProvider>
  </StrictMode>,
)
