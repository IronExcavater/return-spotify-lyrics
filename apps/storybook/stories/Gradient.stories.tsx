import type { Meta, StoryObj } from '@storybook/react-vite';

import { easeGradient } from '@return-spotify-lyrics/ui/gradient';

type GradientArgs = { gradient: string };

const meta = {
    title: 'Gradient',
    // The accent token is green, so the gradients show against the dark background.
    args: {
        gradient: `linear-gradient(to right, var(--background-color-accent), ease-in-out, transparent)`,
    },
    render: ({ gradient }) => {
        const eased = easeGradient(gradient);
        return (
            <div className="flex w-xl max-w-full flex-col gap-3 text-medium">
                <div
                    className="h-24 rounded-medium"
                    style={{ backgroundImage: eased }}
                />
                <code className="text-small break-all text-subdued">
                    {eased}
                </code>
            </div>
        );
    },
} satisfies Meta<GradientArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EaseInOut: Story = {};

export const Steps: Story = {
    args: {
        gradient: `linear-gradient(to right, var(--background-color-accent), steps(4), transparent)`,
    },
};

export const Radial: Story = {
    args: {
        gradient: `radial-gradient(circle, var(--background-color-accent), ease-out, transparent)`,
    },
};
