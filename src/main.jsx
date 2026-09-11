import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/fonts.css';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import App from './App';
import './styles/global.css';
const nativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
if (nativeApp) document.documentElement.classList.add('capacitor-native');
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
if (!nativeApp && 'serviceWorker' in navigator && import.meta.env.PROD) {
  const register = () =>
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        if (registration.waiting) registration.waiting.postMessage('SKIP_WAITING');
        registration.addEventListener('updatefound', () => {
          registration.installing?.addEventListener('statechange', (event) => {
            if (event.target.state === 'installed' && navigator.serviceWorker.controller) {
              event.target.postMessage('SKIP_WAITING');
            }
          });
        });
        return registration.update();
      })
      .catch(console.warn);
  if ('requestIdleCallback' in window) window.requestIdleCallback(register, { timeout: 1800 });
  else window.addEventListener('load', register, { once: true });
}
