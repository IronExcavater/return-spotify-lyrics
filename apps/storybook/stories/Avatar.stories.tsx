import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar } from '@return-spotify-lyrics/ui/Avatar';

const meta = {
    title: 'UI/Identity/Avatar',
    component: Avatar,
    parameters: {
        docs: {
            description: {
                component: 'A single avatar primitive for static, interactive, selected, loading, tooltip, and badge states.',
            },
        },
    },
    args: {
        fallback: 'NR',
        size: 'lg',
        radius: 'full',
        loading: false,
        disabled: false,
    },
    argTypes: {
        size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
        radius: { control: 'select', options: ['none', 'sm', 'md', 'full'] },
        badge: { control: 'text' },
        tooltip: { control: 'text' },
        onClick: { control: false },
    },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Interactive: Story = {
    render: (args) => {
        const [selected, setSelected] = useState(false);
        return <Avatar {...args} selected={selected} tooltip="Select profile" onClick={() => setSelected((value) => !value)} />;
    },
};

export const WithBadge: Story = {
    args: { badge: true, badgeTone: 'accent', tooltip: 'Online' },
};
