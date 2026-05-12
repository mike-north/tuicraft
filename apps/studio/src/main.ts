// Entry point. Boots the app and surfaces fatal init errors in the UI
// instead of leaving the loader spinning forever.

import '@xterm/xterm/css/xterm.css';
import './styles.css';

import { inject } from '@vercel/analytics';
import { app } from './app.js';
import { setupTweaks } from './tweaks.js';

// Initialize Vercel Web Analytics
inject();

declare global {
  interface Window {
    tuicraftApp: typeof app;
  }
}

window.tuicraftApp = app;

app
  .init()
  .then(setupTweaks)
  .catch((err: unknown) => {
    console.error(err);
    const host = document.getElementById('component-list');
    if (host) {
      const msg = err instanceof Error ? err.message : String(err);
      host.innerHTML =
        '<div class="loading" style="color:var(--err)">failed to initialize: ' + msg + '</div>';
    }
  });
