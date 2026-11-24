import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import Spinner from '@return-spotify-lyrics/ui/Spinner';

const meta = {
    title: 'Spinner',
    component: Spinner,
    // The component defaults give every control a value.
    args: { size: '1em', label: 'Loading' },
    // The size takes any CSS length, like 1em, so the control is text.
    argTypes: { size: { control: 'text' } },
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InText: Story = {
    render: (args) => (
        <p className="flex items-center gap-2 text-medium text-subdued">
            <Spinner {...args} />
            Loading your library
        </p>
    ),
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveAccessibleName(
            'Loading'
        );
    },
};

export const Large: Story = {
    args: { size: 48, className: 'text-accent' },
};
