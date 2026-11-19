import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import FadeBox from '@return-spotify-lyrics/ui/FadeBox';
import { EDGES, type Edge } from '@return-spotify-lyrics/ui/geometry';

import { directionControl, lengthControl } from './controls';
import { Placeholder } from './shared';

const meta = {
    title: 'FadeBox',
    component: FadeBox,
    // The component defaults give every control a value, but the size is larger so that the fade shows.
    args: {
        enabled: true,
        size: 32,
        direction: ['left', 'right'],
        corners: true,
        easing: 'ease-in-out',
    },
    argTypes: {
        direction: directionControl,
        size: lengthControl,
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
        // A FadeBox has no role, so the tests find it by its test ID.
        <FadeBox {...args} className="size-50" data-testid="fade-box">
            <Placeholder>Faded content</Placeholder>
        </FadeBox>
    ),
} satisfies Meta<typeof FadeBox>;

export default meta;

type Story = StoryObj<typeof meta>;

// Each edge has a registered size property, which is how far its fade goes in once the transition ends.
function expectFades(box: HTMLElement, faded: readonly Edge[]) {
    return waitFor(() => {
        const style = getComputedStyle(box);
        for (const { name } of EDGES) {
            const size = faded.includes(name) ? '32px' : '0px';
            expect(style.getPropertyValue(`--fade-${name}-size`), name).toBe(
                size
            );
        }
    });
}

const SIDES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

export const LeftAndRight: Story = {
    play: ({ canvas }) =>
        expectFades(canvas.getByTestId('fade-box'), ['left', 'right']),
};

export const AllSides: Story = {
    args: { direction: 'all' },
    // A corner fades on its own only when its two sides don't.
    play: ({ canvas }) => expectFades(canvas.getByTestId('fade-box'), SIDES),
};

export const SquareCorners: Story = {
    args: { direction: 'all', corners: false },
    play: ({ canvas }) => expectFades(canvas.getByTestId('fade-box'), SIDES),
};

export const SingleCorner: Story = {
    args: { direction: ['top-right'] },
    play: ({ canvas }) =>
        expectFades(canvas.getByTestId('fade-box'), ['top-right']),
};

export const LinearEasing: Story = {
    args: { direction: 'all', easing: 'linear' },
    play: ({ canvas }) => expectFades(canvas.getByTestId('fade-box'), SIDES),
};

export const Disabled: Story = {
    args: { direction: 'all', enabled: false },
    play: ({ canvas }) => expectFades(canvas.getByTestId('fade-box'), []),
};
