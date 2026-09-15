import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startPassportHandshakeWatch } from '@/integration/passport';
import { PASSPORT_ORIGIN } from '@/views/app-runtime';
import { App } from './App';
import './index.css';

// Passport can post its embedded ready message before React finishes loading.
// Latch the bound handshake immediately so onboarding can resume reliably.
startPassportHandshakeWatch(PASSPORT_ORIGIN);

const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
