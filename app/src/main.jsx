import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/fonts.css';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './styles/global.css';
const nativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
if (nativeApp) document.documentElement.classList.add('capacitor-native');

const renderApp = () =>
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );

const waitForCriticalFonts = () => {
  if (!document.fonts?.load) return Promise.resolve();
  const fontsReady = Promise.all([
    document.fonts.load('900 54px "Barlow Condensed"'),
    document.fonts.load('700 11px "Barlow Condensed"'),
    document.fonts.load('500 10px "DM Mono"'),
  ]);
  const timeout = new Promise((resolve) => window.setTimeout(resolve, 1500));
  return Promise.race([fontsReady, timeout]);
};

void waitForCriticalFonts().finally(renderApp);
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
