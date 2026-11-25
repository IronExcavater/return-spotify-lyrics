import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import Spinner from '@return-spotify-lyrics/ui/Spinner';
import Text from '@return-spotify-lyrics/ui/Text';

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

/** By default the spinner takes the size and colour of the text around it. */
export const InText: Story = {
    render: (args) => (
        <Text render={<p />} className="flex items-center gap-2 text-subdued">
            <Spinner {...args} />
            Loading your library
        </Text>
    ),
    play: async ({ canvas, args }) => {
        await expect(canvas.getByRole('status')).toHaveAccessibleName(
            String(args.label)
        );
    },
};

/** A whole panel can wait on one large spinner, like the lyrics while they load. */
export const Panel: Story = {
    args: { size: 48, label: 'Loading lyrics', className: 'text-accent' },
    render: (args) => (
        <div className="grid h-48 w-72 place-items-center rounded-medium bg-raised">
            <div className="grid justify-items-center gap-3">
                <Spinner {...args} />
                <Text className="text-small text-subdued">
                    Finding the lyrics for Paper Satellites
                </Text>
            </div>
        </div>
    ),
    play: async ({ canvas, args }) => {
        const spinner = canvas.getByRole('status', {
            name: String(args.label),
        });
        await expect(spinner.getBoundingClientRect().width).toBe(48);
    },
};
