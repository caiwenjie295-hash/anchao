import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RuntimeErrorBoundary } from './components/RuntimeErrorBoundary';
import App from './App';
import { prepareStartup } from './startup/prepareStartup';
import { startBackgroundPrefetch } from './startup/groupReadiness';

void prepareStartup().then(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><RuntimeErrorBoundary><App /></RuntimeErrorBoundary></StrictMode>);
  if (import.meta.env.PROD && location.protocol !== 'file:') window.setTimeout(startBackgroundPrefetch, 1200);
  requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('anchao-startup')?.remove()));
});
