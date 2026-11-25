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

export const NoEasing: Story = {
    args: {
        gradient: `linear-gradient(to right, var(--background-color-accent), transparent)`,
    },
};

export const Steps: Story = {
    args: {
        gradient: `linear-gradient(to right, var(--background-color-accent), steps(4), transparent)`,
    },
};

export const CubicBezier: Story = {
    args: {
        gradient: `linear-gradient(to right, var(--background-color-accent), cubic-bezier(0.7, 0, 0.3, 1), transparent)`,
    },
};

export const PositionedStops: Story = {
    args: {
        gradient: `linear-gradient(to right, var(--background-color-accent) 20%, ease-in, transparent 80%)`,
    },
};

export const MixedUnits: Story = {
    args: {
        gradient: `linear-gradient(to right, var(--background-color-accent), ease-out, transparent calc(100% - 2rem))`,
    },
};

export const Radial: Story = {
    args: {
        gradient: `radial-gradient(circle, var(--background-color-accent), ease-out, transparent)`,
    },
};

export const Repeating: Story = {
    args: {
        gradient: `repeating-linear-gradient(to right, var(--background-color-accent), ease-in-out, transparent 48px)`,
    },
};
