import type { Meta, StoryObj } from '@storybook/react-vite';

import { easeGradient } from '@return-spotify-lyrics/ui/gradient';

type GradientArgs = { gradient: string };

const meta = {
    title: 'Gradient',
    args: {
        gradient:
            'linear-gradient(to right, #1ed760, ease-in-out, transparent)',
    },
    render: ({ gradient }) => {
        const eased = easeGradient(gradient);
        return (
            <div className="flex max-w-xl flex-col gap-3 text-medium">
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
    args: { gradient: 'linear-gradient(to right, #1ed760, transparent)' },
};

export const Steps: Story = {
    args: {
        gradient: 'linear-gradient(to right, #1ed760, steps(4), transparent)',
    },
};

export const CubicBezier: Story = {
    args: {
        gradient:
            'linear-gradient(to right, #1ed760, cubic-bezier(0.7, 0, 0.3, 1), transparent)',
    },
};

export const PositionedStops: Story = {
    args: {
        gradient:
            'linear-gradient(to right, #1ed760 20%, ease-in, transparent 80%)',
    },
};

export const MixedUnits: Story = {
    args: {
        gradient:
            'linear-gradient(to right, #1ed760, ease-out, transparent calc(100% - 2rem))',
    },
};

export const Radial: Story = {
    args: {
        gradient: 'radial-gradient(circle, #1ed760, ease-out, transparent)',
    },
};

export const Repeating: Story = {
    args: {
        gradient:
            'repeating-linear-gradient(to right, #1ed760, ease-in-out, transparent 48px)',
    },
};
