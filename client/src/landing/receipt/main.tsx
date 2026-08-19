import React from 'react';
import ReactDOM from 'react-dom/client';
import { Receipt } from './Receipt';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Receipt />
  </React.StrictMode>
);
