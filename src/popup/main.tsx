import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/popup.css';
import { MemoryRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Theme
            appearance="dark"
            accentColor="grass"
            panelBackground="translucent"
        >
            <MemoryRouter>
                <App />
            </MemoryRouter>
        </Theme>
    </React.StrictMode>
);
