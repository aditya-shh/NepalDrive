import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Automatically normalize direct paths (e.g. /reset-password?token=...) into HashRouter paths
if (typeof window !== 'undefined' && window.location.pathname.length > 1 && !window.location.hash) {
  const target = window.location.pathname + window.location.search;
  window.history.replaceState(null, '', `/#${target}`);
}

createRoot(document.getElementById('root')!).render(<App />);
