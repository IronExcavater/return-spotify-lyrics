import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import Button from '@return-spotify-lyrics/ui/Button';
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
        defaultValue: { width: 320, height: 200 },
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

// A person sees each button whole, so the box must hold every button inside its edges.
function expectButtonsInside(
    canvas: PlayContext['canvas'],
    handle: HTMLElement,
    axis: 'width' | 'height',
    smallerThan: number
) {
    return waitFor(() => {
        const box = handle.parentElement!.getBoundingClientRect();
        expect(box[axis]).toBeLessThan(smallerThan);
        for (const button of canvas.getAllByRole('button')) {
            const rect = button.getBoundingClientRect();
            expect(rect.left).toBeGreaterThanOrEqual(box.left - 1);
            expect(rect.right).toBeLessThanOrEqual(box.right + 1);
            expect(rect.top).toBeGreaterThanOrEqual(box.top - 1);
            expect(rect.bottom).toBeLessThanOrEqual(box.bottom + 1);
        }
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

export const ContentAndParentLimits: Story = {
    args: { edges: ['right', 'bottom'] },
    // The panel is narrower than the box can grow, so the panel stops the width.
    render: (args) => (
        <div className="w-100">
            <ResizeBox {...args}>
                <div className="flex items-center justify-center gap-2 bg-raised p-4">
                    <Button>Shuffle</Button>
                    <Button>Play</Button>
                    <Button>Repeat</Button>
                </div>
            </ResizeBox>
        </div>
    ),
    play: async ({ canvas, userEvent, step, args }) => {
        const right = await focusHandle({ canvas, userEvent }, 'Resize right');
        const panel = right.parentElement!.parentElement!;
        const height = args.defaultValue?.height ?? 0;

        await step('The width stops at the panel', async () => {
            await userEvent.keyboard('{Shift>}{ArrowRight>4/}{/Shift}');
            await expectSize(right, panel.clientWidth, height);
        });

        await step('The width stops where the buttons still fit', async () => {
            await userEvent.keyboard('{Shift>}{ArrowLeft>8/}{/Shift}');
            await expectButtonsInside(
                canvas,
                right,
                'width',
                panel.clientWidth
            );
        });

        await step('The height stops where the buttons still fit', async () => {
            const bottom = await focusHandle(
                { canvas, userEvent },
                'Resize bottom'
            );
            await userEvent.keyboard('{Shift>}{ArrowUp>8/}{/Shift}');
            await expectButtonsInside(canvas, bottom, 'height', height);
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
        defaultValue: { width: 320, height: 180 },
        minAspectRatio: 16 / 9,
        maxAspectRatio: 16 / 9,
    },
    play: async ({ canvas, userEvent, step, args }) => {
        const right = await focusHandle({ canvas, userEvent }, 'Resize right');
        const ratio = args.minAspectRatio ?? 1;

        await step('The height follows the width', async () => {
            await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
            await expectSize(right, 370, 370 / ratio);
        });

        // The keys ask for 120 px, but the text stops the box first, and the ratio still holds exactly.
        await step('The ratio holds where the text stops the box', async () => {
            await userEvent.keyboard('{Shift>}{ArrowLeft>5/}{/Shift}');
            await waitFor(() => {
                const box = right.parentElement!.getBoundingClientRect();
                expect(box.width).toBeGreaterThan(120);
                expect(
                    Math.abs(box.width - box.height * ratio)
                ).toBeLessThanOrEqual(1);
            });
        });
    },
};
