import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('main.tsx: Starting application');
console.log('main.tsx: React DOM available:', createRoot);

// Simple service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered:', registration);
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
}

console.log('main.tsx: Creating React root');
createRoot(document.getElementById("root")!).render(<App />);