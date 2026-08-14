import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AppError } from './AppError';
import { ErrorPage } from './ErrorPage';

describe('ErrorPage', () => {
    it('renders a useful message and available recovery actions', () => {
        const markup = renderToStaticMarkup(
            <ErrorPage
                error={new AppError('network.offline', 'You appear to be offline')}
                onRetry={() => undefined}
                showHome
                showReload
            />
        );

        expect(markup).toContain('Something went wrong');
        expect(markup).toContain('You appear to be offline');
        expect(markup).toContain('Try again');
        expect(markup).toContain('Home');
        expect(markup).toContain('Reload');
    });
});
