import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import ResizeBox from '@return-spotify-lyrics/ui/ResizeBox';

import { edgesControl, lengthControl } from './controls';
import { Placeholder } from './shared';

const meta = {
    title: 'ResizeBox',
    component: ResizeBox,
    // A centred box moves each edge half as far as the pointer, so the box stays at the top left.
    parameters: { layout: 'padded' },
    // The component defaults give every control a value, and an empty aspect ratio means no limit.
    args: {
        value: { width: 320, height: 200 },
        minSize: {},
        maxSize: {},
        edges: edgesControl.options,
        showGrip: true,
        handleSize: 14,
        handlePlacement: 'overlap',
        keyStep: 10,
    },
    argTypes: {
        edges: edgesControl,
        handleSize: lengthControl,
        minAspectRatio: { control: { type: 'number', min: 0, step: 0.1 } },
        maxAspectRatio: { control: { type: 'number', min: 0, step: 0.1 } },
        onValueChange: { action: 'valueChange' },
        onValueCommitted: { action: 'valueCommitted' },
    },
    render: (args) => (
        <ResizeBox {...args}>
            <Placeholder>
                Drag an edge, or Tab to a handle and use the arrow keys
            </Placeholder>
        </ResizeBox>
    ),
} satisfies Meta<typeof ResizeBox>;

export default meta;

type Story = StoryObj<typeof meta>;
type PlayContext = Parameters<NonNullable<Story['play']>>[0];

// Tab moves focus as a keyboard user does, so the test reaches the handle the same way.
async function focusHandle(
    { canvas, userEvent }: Pick<PlayContext, 'canvas' | 'userEvent'>,
    name: string
) {
    const handle = canvas.getByRole('separator', { name });
    for (let tab = 0; tab < 10 && !handle.matches(':focus'); tab++) {
        await userEvent.tab();
    }
    await expect(handle).toHaveFocus();
    return handle;
}

// Browsers round sizes differently, so a size can be up to 1px out.
function expectSize(handle: HTMLElement, width: number, height: number) {
    return waitFor(() => {
        const box = handle.parentElement!.getBoundingClientRect();
        expect(Math.abs(box.width - width)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.height - height)).toBeLessThanOrEqual(1);
    });
}

export const RightAndBottom: Story = {
    args: { edges: ['right', 'bottom'] },
    play: async ({ canvas, userEvent, step }) => {
        const right = await focusHandle({ canvas, userEvent }, 'Resize right');

        await step('An arrow key moves the edge one step', async () => {
            await userEvent.keyboard('{ArrowRight}');
            await expectSize(right, 330, 200);
            await expect(right).toHaveAttribute('aria-valuenow', '330');
        });

        await step('Shift moves the edge five steps', async () => {
            await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
            await expectSize(right, 280, 200);
        });

        await step('A key across the edge does nothing', async () => {
            await userEvent.keyboard('{ArrowDown}');
            await expectSize(right, 280, 200);
        });
    },
};

export const AllEdges: Story = {
    play: async ({ canvas, userEvent }) => {
        const corner = canvas.getByRole('separator', {
            name: 'Resize bottom right',
        });
        // userEvent pointers are not real, so Firefox refuses to capture them, but a real drag captures as normal.
        corner.setPointerCapture = () => {};

        await userEvent.pointer([
            {
                keys: '[MouseLeft>]',
                target: corner,
                coords: { screenX: 500, screenY: 500 },
            },
            { target: corner, coords: { screenX: 540, screenY: 530 } },
            { keys: '[/MouseLeft]', target: corner },
        ]);

        await expectSize(corner, 360, 230);
    },
};

export const Inset: Story = {
    args: { handlePlacement: 'inset' },
};

export const WithLimits: Story = {
    args: {
        minSize: { width: 200, height: 120 },
        maxSize: { width: 480, height: 320 },
    },
    play: async ({ canvas, userEvent, step }) => {
        const right = await focusHandle({ canvas, userEvent }, 'Resize right');

        await step('The width stops at its maximum', async () => {
            await userEvent.keyboard('{Shift>}{ArrowRight>4/}{/Shift}');
            await expectSize(right, 480, 200);
            await expect(right).toHaveAttribute('aria-valuemax', '480');
        });

        await step('The width stops at its minimum', async () => {
            await userEvent.keyboard('{Shift>}{ArrowLeft>8/}{/Shift}');
            await expectSize(right, 200, 200);
            await expect(right).toHaveAttribute('aria-valuemin', '200');
        });
    },
};

export const AspectRatioLimits: Story = {
    args: { minAspectRatio: 1, maxAspectRatio: 2 },
    play: async ({ canvas, userEvent }) => {
        const bottom = await focusHandle(
            { canvas, userEvent },
            'Resize bottom'
        );

        // The height leads, so the width follows it to keep the ratio at 1 or more.
        await userEvent.keyboard('{Shift>}{ArrowDown>4/}{/Shift}');
        await expectSize(bottom, 400, 400);
    },
};

export const FixedAspectRatio: Story = {
    args: {
        value: { width: 320, height: 180 },
        minAspectRatio: 16 / 9,
        maxAspectRatio: 16 / 9,
    },
    play: async ({ canvas, userEvent }) => {
        const right = await focusHandle({ canvas, userEvent }, 'Resize right');

        await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
        await expectSize(right, 370, (370 * 9) / 16);
    },
};
