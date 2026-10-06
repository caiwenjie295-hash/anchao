import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RuntimeErrorBoundary } from './components/RuntimeErrorBoundary';
import App from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><RuntimeErrorBoundary><App /></RuntimeErrorBoundary></StrictMode>);
