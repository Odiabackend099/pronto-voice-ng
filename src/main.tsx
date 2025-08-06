import React from "react";
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeMonitoring } from './utils/monitoring'

// Production-ready initialization
console.log('🚀 Protect.NG CrossAI - Production Mode');

// Verify React is properly loaded
if (!React || !createRoot) {
  console.error('❌ React failed to load properly');
  throw new Error('React initialization failed');
}

// Simple, reliable service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered');
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New version available');
            }
          });
        }
      });
    } catch (error) {
      console.error('❌ Service Worker failed:', error);
    }
  });
}

// Initialize app with error handling
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  
  // Initialize production monitoring
  initializeMonitoring();
  
  const root = createRoot(rootElement);
  root.render(React.createElement(App));
  console.log('✅ App initialized successfully');
} catch (error) {
  console.error('❌ App initialization failed:', error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; text-align: center; padding: 20px;">
      <div>
        <h1 style="color: #dc2626; margin-bottom: 16px;">Application Error</h1>
        <p style="color: #6b7280; margin-bottom: 20px;">Failed to initialize Protect.NG CrossAI</p>
        <button onclick="window.location.reload()" style="background: #16a34a; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
          Reload Application
        </button>
      </div>
    </div>
  `;
}