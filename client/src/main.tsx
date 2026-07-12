import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import MagicWebViewTest from './MagicWebViewTest';
import './styles.css';

// TEMPORARY: VITE_WEBVIEW_TEST=1 renders the isolated Magic/UA WebView test instead of the
// app, so we can validate Magic in WKWebView without touching the main App. Remove later.
const WEBVIEW_TEST = import.meta.env.VITE_WEBVIEW_TEST === '1';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {WEBVIEW_TEST ? <MagicWebViewTest /> : <App />}
  </React.StrictMode>
);
