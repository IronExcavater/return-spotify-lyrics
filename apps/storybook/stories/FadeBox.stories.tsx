import type { Meta, StoryObj } from '@storybook/react-vite';

import FadeBox from '@return-spotify-lyrics/ui/FadeBox';

import { directionControl } from './controls';

const meta = {
    title: 'FadeBox',
    component: FadeBox,
    args: { size: 32 },
    argTypes: {
        direction: directionControl,
        easing: {
            control: 'select',
            options: [
                'linear',
                'ease',
                'ease-in',
                'ease-out',
                'ease-in-out',
                'steps(4)',
            ],
        },
    },
    render: (args) => (
        <FadeBox {...args} className="size-50">
            <div className="grid size-full place-items-center bg-raised text-medium">
                Faded content
            </div>
        </FadeBox>
    ),
} satisfies Meta<typeof FadeBox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LeftAndRight: Story = {};

export const AllSides: Story = {
    args: { direction: 'all' },
};

export const SquareCorners: Story = {
    args: { direction: 'all', corners: false },
};

export const SingleCorner: Story = {
    args: { direction: ['top-right'] },
};

export const LinearEasing: Story = {
    args: { direction: 'all', easing: 'linear' },
};

export const Disabled: Story = {
    args: { direction: 'all', enabled: false },
};
