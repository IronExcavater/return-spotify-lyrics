import { describe, expect, it } from 'vitest';

import { spotifyErrorFromResponse } from './client';

describe('spotifyErrorFromResponse', () => {
    it('maps rate limiting and Retry-After', () => {
        const response = new Response(null, {
            status: 429,
            headers: { 'Retry-After': '7' },
        });

        const error = spotifyErrorFromResponse(response);

        expect(error.code).toBe('spotify.rate_limited');
        expect(error.retryAfter).toBe(7);
    });

    it('maps authentication failures', () => {
        expect(spotifyErrorFromResponse(new Response(null, { status: 401 })).code).toBe(
            'auth.reauthorization_required'
        );
    });

    it('maps missing resources', () => {
        expect(spotifyErrorFromResponse(new Response(null, { status: 404 })).code).toBe(
            'spotify.not_found'
        );
    });
});
