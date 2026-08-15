import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '@return-spotify-lyrics/ui/Card';
import { List, ListItem } from '@return-spotify-lyrics/ui/List';
import { Separator } from '@return-spotify-lyrics/ui/Separator';

const meta = {
    title: 'UI/Layout/Card',
    component: Card,
    args: {
        variant: 'raised',
        padding: 'md',
        interactive: false,
        children: (
            <>
                <strong>Now playing</strong>
                <p className="mt-1 text-sm text-text-muted">
                    A simple compositional surface.
                </p>
            </>
        ),
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['surface', 'raised', 'outline', 'ghost'],
        },
        padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
        children: { control: false },
    },
    parameters: {
        docs: {
            description: {
                component:
                    'A low-level surface primitive. Lists and separators compose inside it rather than requiring specialised card variants.',
            },
        },
    },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const WithList: Story = {
    render: (args) => (
        <Card {...args} padding="none">
            <List>
                <ListItem className="p-3">First track</ListItem>
                <Separator />
                <ListItem className="p-3">Second track</ListItem>
            </List>
        </Card>
    ),
};
