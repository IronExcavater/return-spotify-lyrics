import { describe, expect, it } from 'vitest';

import { AppError, asAppError } from './AppError';

describe('AppError', () => {
    it('preserves an existing AppError', () => {
        const error = new AppError('spotify.no_active_device', 'No active device');

        expect(asAppError(error)).toBe(error);
    });

    it('normalizes Error instances without losing the message or cause', () => {
        const cause = new Error('Connection reset');
        const error = asAppError(cause);

        expect(error.code).toBe('app.unexpected');
        expect(error.message).toBe('Connection reset');
        expect(error.cause).toBe(cause);
    });

    it('normalizes unknown thrown values to a stable error', () => {
        const error = asAppError({ broken: true });

        expect(error.code).toBe('app.unexpected');
        expect(error.message).toBe('Something went wrong');
    });

    it('stores retry-after information when supplied', () => {
        const error = new AppError('spotify.rate_limited', 'Slow down', {
            retryAfter: 12,
        });

        expect(error.retryAfter).toBe(12);
    });
});
