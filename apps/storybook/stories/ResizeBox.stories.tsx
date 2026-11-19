import type { Meta, StoryObj } from '@storybook/react-vite';

import ResizeBox from '@return-spotify-lyrics/ui/ResizeBox';

import { directionControl } from './controls';

const meta = {
    title: 'ResizeBox',
    component: ResizeBox,
    // The component defaults give every control a value, and an empty aspect ratio means no limit.
    args: {
        size: { width: 320, height: 200 },
        minSize: {},
        maxSize: {},
        direction: directionControl.options,
        showIndicator: true,
        thickness: 14,
        placement: 'overlap',
        step: 10,
    },
    argTypes: {
        direction: directionControl,
        // The docs plugin cannot read these imported types, so it guesses the wrong control.
        thickness: { control: 'number' },
        minAspectRatio: { control: { type: 'number', min: 0, step: 0.1 } },
        maxAspectRatio: { control: { type: 'number', min: 0, step: 0.1 } },
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

export const AspectRatioLimits: Story = {
    args: { minAspectRatio: 1, maxAspectRatio: 2 },
};

export const FixedAspectRatio: Story = {
    args: {
        size: { width: 320, height: 180 },
        minAspectRatio: 16 / 9,
        maxAspectRatio: 16 / 9,
    },
};
