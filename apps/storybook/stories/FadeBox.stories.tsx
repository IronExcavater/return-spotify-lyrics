import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import FadeBox from '@return-spotify-lyrics/ui/FadeBox';
import { EDGES, type Edge } from '@return-spotify-lyrics/ui/geometry';

import { edgesControl, lengthControl } from './controls';
import { Placeholder } from './shared';

const meta = {
    title: 'FadeBox',
    component: FadeBox,
    // The component defaults give every control a value, but the depth is larger so that the fade shows.
    args: {
        enabled: true,
        depth: 32,
        edges: ['left', 'right'],
        roundCorners: true,
        easing: 'ease-in-out',
    },
    argTypes: {
        edges: edgesControl,
        depth: lengthControl,
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

export const LeftAndRight: Story = {
    play: ({ canvas }) =>
        expectFades(canvas.getByTestId('fade-box'), ['left', 'right']),
};

/** Every side fades, and a corner fades on its own only when its two sides don't. The controls change the corners and the easing. */
export const AllSides: Story = {
    args: { edges: 'all' },
    // A corner fades on its own only when its two sides don't.
    play: ({ canvas }) =>
        expectFades(canvas.getByTestId('fade-box'), [
            'top',
            'right',
            'bottom',
            'left',
        ]),
};

export const SingleCorner: Story = {
    args: { edges: ['top-right'] },
    play: ({ canvas }) =>
        expectFades(canvas.getByTestId('fade-box'), ['top-right']),
};

export const Disabled: Story = {
    args: { edges: 'all', enabled: false },
    play: ({ canvas }) => expectFades(canvas.getByTestId('fade-box'), []),
};
