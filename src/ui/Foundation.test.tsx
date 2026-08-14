import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Avatar } from './Avatar';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Skeleton, hashUnit } from './Skeleton';
import { Switch } from './Switch';

describe('Button', () => {
    it('supports icon-only buttons with badges and accessible labels', () => {
        const markup = renderToStaticMarkup(
            <Button iconOnly aria-label="Queue" badge={3}>
                <span>icon</span>
            </Button>
        );

        expect(markup).toContain('aria-label="Queue"');
        expect(markup).toContain('data-badge');
        expect(markup).toContain('>3<');
    });

    it('can derive an icon-only accessible label from a string tooltip', () => {
        const markup = renderToStaticMarkup(
            <Button iconOnly tooltip="Play">
                <span>icon</span>
            </Button>
        );

        expect(markup).toContain('aria-label="Play"');
    });
});

describe('Avatar', () => {
    it('uses button semantics when interactive and supports selection/badges', () => {
        const markup = renderToStaticMarkup(
            <Avatar fallback="NR" selected badge onClick={() => undefined} />
        );

        expect(markup).toContain('<button');
        expect(markup).toContain('aria-pressed="true"');
        expect(markup).toContain('data-badge');
    });
});

describe('Skeleton', () => {
    it('hashes deterministically', () => {
        expect(hashUnit('track:42')).toBe(hashUnit('track:42'));
        expect(hashUnit('track:42')).not.toBe(hashUnit('track:43'));
    });

    it('keeps arbitrary child content for geometry and renders a glint layer', () => {
        const markup = renderToStaticMarkup(
            <Skeleton loading hash="title:42">
                <span className="text-lg">A long title</span>
            </Skeleton>
        );

        expect(markup).toContain('data-skeleton');
        expect(markup).toContain('data-skeleton-glint');
        expect(markup).toContain('A long title');
    });
});

describe('form primitives', () => {
    it('renders accessible checkbox and switch labels', () => {
        const checkbox = renderToStaticMarkup(<Checkbox label="Explicit content" />);
        const toggle = renderToStaticMarkup(<Switch label="Compact media" />);

        expect(checkbox).toContain('Explicit content');
        expect(toggle).toContain('Compact media');
    });
});
