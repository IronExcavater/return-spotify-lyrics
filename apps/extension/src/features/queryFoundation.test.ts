import { describe, expect, it } from 'vitest';

import { authKeys } from './auth/queries';
import { playerKeys } from './player/queries';

describe('feature query keys', () => {
    it('uses stable namespaced auth keys', () => {
        expect(authKeys.session()).toEqual(['auth', 'session']);
    });

    it('uses stable namespaced playback keys', () => {
        expect(playerKeys.playback()).toEqual(['spotify', 'playback']);
    });
});
