import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/assets/app.css';

import App from './App';
import AppProviders from './providers';
import type { Surface } from './surface/types';

export default function mountApp(surface: Surface) {
    const root = document.getElementById('root');
    if (!root) throw new Error('Missing #root element');

    createRoot(root).render(
        <StrictMode>
            <AppProviders surface={surface}>
                <App />
            </AppProviders>
        </StrictMode>
    );
}
