import React from 'react';
import { Theme } from '@radix-ui/themes';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import './styles/popup.css';

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
