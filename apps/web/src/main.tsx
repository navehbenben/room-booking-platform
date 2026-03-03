import './i18n/index'; // MUST be first — initialises i18next before React renders
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { datadogLogs } from '@datadog/browser-logs';
import { store } from './store';
import { App } from './ui/App';
import './styles/global.scss';

// ---------------------------------------------------------------------------
// Datadog Browser Logs
// Set VITE_DD_CLIENT_TOKEN (and optionally VITE_DD_SITE) in your .env file.
// The client token is safe to expose in browser bundles — it can only send
// logs, not read them. Never put your server-side DD_API_KEY here.
// ---------------------------------------------------------------------------
const DD_CLIENT_TOKEN = import.meta.env.VITE_DD_CLIENT_TOKEN as string | undefined;
if (DD_CLIENT_TOKEN) {
  datadogLogs.init({
    clientToken: DD_CLIENT_TOKEN,
    site: (import.meta.env.VITE_DD_SITE as string | undefined) ?? 'datadoghq.com',
    service: 'room-booking-web',
    env: import.meta.env.MODE,
    // Forward unhandled JS errors and promise rejections automatically
    forwardErrorsToLogs: true,
    // Forward console.warn and console.error calls
    forwardConsoleLogs: ['warn', 'error'],
    sessionSampleRate: 100,
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
