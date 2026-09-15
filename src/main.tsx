import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * Offline support for the seat tracker — the hall's wifi is not something to
 * rely on with a queue of parents waiting. Registered after load so it never
 * delays the first paint, and skipped in dev where it only gets in the way of
 * hot reloading.
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // No offline support is survivable; a failed registration is not worth
      // an error in front of a guest.
    });
  });
}
