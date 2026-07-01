import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { LocalStorageMetaRepository } from './infrastructure/persistence/localStorageMetaRepository';
import { initMetaStore } from './application/meta/metaStore';

// ============================================================================
// COMPOSITION ROOT (a.k.a. wiring / bootstrap).
//
// This is the ONLY place in the whole app that knows about the concrete
// persistence adapter. Everything else (stores, screens, services) depends on
// the domain's IMetaRepository abstraction, so swapping localStorage for,
// say, a server-backed repository only touches this file.
//
// Order matters: initialize stores BEFORE React renders, so that any consumer
// (which calls useMetaStore/getMetaStore during render or inside an action)
// sees a ready store.
// ============================================================================

const metaRepository = new LocalStorageMetaRepository();
initMetaStore(metaRepository);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
