import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/assets/app.css';

import { App } from './App';
import { AppProviders } from './providers';
import type { Surface } from './surface/types';

export function mountApp(surface: Surface) {
    const root = document.getElementById('root');
    if (!root) {
        throw new Error('Missing #root application element');
    }

    createRoot(root).render(
        <StrictMode>
            <AppProviders surface={surface}>
                <App />
            </AppProviders>
        </StrictMode>
    );
}
