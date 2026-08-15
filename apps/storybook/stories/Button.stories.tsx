import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Play } from 'lucide-react';

import { Button } from '@return-spotify-lyrics/ui/Button';

const meta = {
    title: 'UI/Actions/Button',
    component: Button,
    parameters: {
        docs: {
            description: {
                component: 'The single button primitive for text, icons, loading states, tooltips, and badges. Use iconOnly instead of a separate IconButton component.',
            },
        },
    },
    args: {
        children: 'Play',
        variant: 'solid',
        size: 'md',
        radius: 'md',
        loading: false,
        disabled: false,
    },
    argTypes: {
        variant: { control: 'select', options: ['solid', 'ghost', 'outline', 'danger'] },
        size: { control: 'select', options: ['xs', 'sm', 'md', 'lg'] },
        radius: { control: 'select', options: ['none', 'sm', 'md', 'full'] },
        icon: { control: false },
        tooltip: { control: 'text' },
        badge: { control: 'text' },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithIcon: Story = {
    args: { icon: <Play size={16} />, children: 'Play track' },
};

export const IconOnly: Story = {
    args: {
        iconOnly: true,
        children: <Bell size={17} />,
        tooltip: 'Notifications',
        badge: '3',
    },
};
