import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RuntimeErrorBoundary } from './components/RuntimeErrorBoundary';
import App from './App';
import { prepareStartup } from './startup/prepareStartup';

void prepareStartup().then(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><RuntimeErrorBoundary><App /></RuntimeErrorBoundary></StrictMode>);
  requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('anchao-startup')?.remove()));
});
