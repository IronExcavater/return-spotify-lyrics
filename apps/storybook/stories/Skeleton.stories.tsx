import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar } from '@return-spotify-lyrics/ui/Avatar';
import { Skeleton } from '@return-spotify-lyrics/ui/Skeleton';

const meta = {
    title: 'UI/Feedback/Skeleton',
    component: Skeleton,
    parameters: {
        docs: {
            description: {
                component:
                    'One skeleton primitive for arbitrary child geometry. Hashing provides stable visual variation and the animated glint is shared across shapes.',
            },
        },
    },
    args: {
        loading: true,
        hash: 'storybook',
        children: (
            <span className="text-lg font-semibold">Loading song title</span>
        ),
    },
    argTypes: {
        children: { control: false },
        width: { control: 'text' },
        height: { control: 'text' },
        size: { control: 'text' },
        radius: { control: 'text' },
    },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {};
export const Circle: Story = {
    args: {
        size: 56,
        radius: 999,
        children: <Avatar size="xl" fallback="NR" />,
    },
};
export const DeterministicRange: Story = {
    args: { width: [160, 280], height: 18, radius: [4, 10], hash: 'track:42' },
};
