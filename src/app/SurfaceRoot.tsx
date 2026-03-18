import React from 'react';
import { Theme } from '@radix-ui/themes';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import type { Surface } from './surface';
import './styles/globals.css';

type SurfaceRootProps = {
    surface: Surface;
};

export function SurfaceRoot({ surface }: SurfaceRootProps) {
    return (
        <Theme
            appearance="dark"
            accentColor="grass"
            panelBackground="translucent"
        >
            <MemoryRouter>
                <App surface={surface} />
            </MemoryRouter>
        </Theme>
    );
}
