import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Badge } from './Badge';
import { Card } from './Card';
import { Dialog } from './Dialog';
import { List, ListItem } from './List';
import { Menu } from './Menu';
import { Popover } from './Popover';
import { Separator } from './Separator';
import { Spinner } from './Spinner';

describe('display primitives', () => {
    it('renders badges, cards and list semantics', () => {
        const markup = renderToStaticMarkup(
            <Card variant="raised">
                <Badge content={2} />
                <List>
                    <ListItem>Track</ListItem>
                </List>
                <Separator />
                <Spinner label="Loading tracks" />
            </Card>
        );

        expect(markup).toContain('data-badge');
        expect(markup).toContain('role="list"');
        expect(markup).toContain('role="listitem"');
        expect(markup).toContain('role="separator"');
        expect(markup).toContain('aria-label="Loading tracks"');
    });
});

describe('compound primitives', () => {
    it('exposes the common root/trigger/content shape', () => {
        expect(Dialog.Root).toBeDefined();
        expect(Dialog.Trigger).toBeDefined();
        expect(Dialog.Content).toBeDefined();
        expect(Popover.Root).toBeDefined();
        expect(Popover.Trigger).toBeDefined();
        expect(Popover.Content).toBeDefined();
        expect(Menu.Root).toBeDefined();
        expect(Menu.Trigger).toBeDefined();
        expect(Menu.Content).toBeDefined();
    });
});
