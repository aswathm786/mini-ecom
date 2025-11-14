/**
 * Main Entry Point
 * 
 * Bootstraps CSRF token, then renders the React app.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { bootstrapCsrf } from './lib/csrf';
import './styles/main.css';

// Show loading screen while bootstrapping
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

// Initial loading screen
root.render(
  <React.StrictMode>
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  </React.StrictMode>
);

// Bootstrap CSRF token, then render app
bootstrapCsrf()
  .then(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((error) => {
    console.error('Failed to bootstrap app:', error);
    // Still render app even if CSRF bootstrap fails
    // Server-side rendering will inject token later
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
