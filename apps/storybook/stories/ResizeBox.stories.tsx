import type { Meta, StoryObj } from '@storybook/react-vite';

import ResizeBox from '@return-spotify-lyrics/ui/ResizeBox';

import { directionControl } from './controls';

const meta = {
    title: 'ResizeBox',
    component: ResizeBox,
    args: { size: { width: 320, height: 200 } },
    argTypes: {
        direction: directionControl,
        onChange: { action: 'change' },
        onChangeEnd: { action: 'changeEnd' },
    },
    render: (args) => (
        <ResizeBox {...args}>
            <div className="grid place-items-center bg-raised p-4 text-center text-medium">
                Drag an edge, or Tab to a handle and use the arrow keys
            </div>
        </ResizeBox>
    ),
} satisfies Meta<typeof ResizeBox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RightAndBottom: Story = {
    args: { direction: ['right', 'bottom'] },
};

export const AllEdges: Story = {};

export const Inset: Story = {
    args: { placement: 'inset' },
};

export const WithLimits: Story = {
    args: {
        minSize: { width: 200, height: 120 },
        maxSize: { width: 480, height: 320 },
    },
};
