import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import Link from '@return-spotify-lyrics/ui/Link';
import Marquee from '@return-spotify-lyrics/ui/Marquee';
import Text from '@return-spotify-lyrics/ui/Text';

import { lengthControl } from './controls';

const meta = {
    title: 'Marquee',
    component: Marquee,
    // The component defaults give every control a value. The delay and the rest depend on other props, so they start empty.
    args: {
        children: 'Paper Satellites (Northern Static Remix) · The Quiet Hours',
        direction: 'left',
        motion: 'loop',
        fill: false,
        play: 'auto',
        speed: 40,
        separator: { variant: 'dot', gap: 12 },
        fadeDepth: 24,
    },
    argTypes: {
        children: { control: 'text' },
        separator: { control: 'object' },
        fadeDepth: lengthControl,
    },
    // A marquee shows a title that is too long for its row, like the track in the player.
    render: (args) => (
        <div className="flex w-64 items-center gap-3 rounded-medium bg-raised p-2 text-medium">
            <div className="size-10 shrink-0 rounded-small bg-overlay" />
            <div className="min-w-0 flex-1">
                {/* A Marquee has no role, so the tests find it by its test ID. */}
                <Marquee
                    {...args}
                    className={`font-bold ${args.className ?? ''}`}
                    data-testid="marquee"
                />
                <Text className="block text-small text-subdued">
                    The Quiet Hours
                </Text>
            </div>
        </div>
    ),
} satisfies Meta<typeof Marquee>;

export default meta;

type Story = StoryObj<typeof meta>;

function expectToMove(element: HTMLElement) {
    const start = element.getBoundingClientRect();
    // The delay before the first pass is a second, so a move can take a little longer than that.
    return waitFor(
        () => {
            const { x, y } = element.getBoundingClientRect();
            expect(Math.hypot(x - start.x, y - start.y)).toBeGreaterThan(2);
        },
        { timeout: 3000 }
    );
}

export const NowPlaying: Story = {
    play: async ({ canvas, args }) => {
        // The copy is hidden from assistive technology, so a person hears the text once.
        await waitFor(() =>
            expect(canvas.getAllByText(String(args.children))).toHaveLength(2)
        );
        const [original] = canvas.getAllByText(String(args.children));
        await expectToMove(original!);
    },
};

export const Fits: Story = {
    args: { children: 'Slow Orbit' },
    play: async ({ canvas, args }) => {
        await expect(canvas.getAllByText(String(args.children))).toHaveLength(
            1
        );
    },
};

/** Fill loops short content too, with copies and a separator of any variant between them. */
export const Fill: Story = {
    args: {
        children: 'Slow Orbit',
        fill: true,
        separator: { variant: 'cross', gap: 16 },
    },
    play: async ({ canvas, args }) => {
        // Short content needs several copies to fill the box with no gap.
        await waitFor(() =>
            expect(
                canvas.getAllByText(String(args.children)).length
            ).toBeGreaterThan(2)
        );
        const [original] = canvas.getAllByText(String(args.children));
        await expectToMove(original!);
    },
};

/** Up and down move the content through the height of the marquee, like lyrics. */
export const Vertical: Story = {
    args: { direction: 'up', className: 'h-5' },
    play: async ({ canvas, args }) => {
        await waitFor(() =>
            expect(canvas.getAllByText(String(args.children))).toHaveLength(2)
        );
        const [original] = canvas.getAllByText(String(args.children));
        await expectToMove(original!);
    },
};

/** A bounce rests at each end, and a loop waits only once before it starts. */
export const Bounce: Story = {
    args: { motion: 'bounce' },
    play: async ({ canvas, args }) => {
        const text = canvas.getByText(String(args.children));
        await expectToMove(text);
        await expect(canvas.getAllByText(String(args.children))).toHaveLength(
            1
        );
    },
};

export const PlayOnHover: Story = {
    args: { play: 'hover' },
    play: async ({ canvas, userEvent, args }) => {
        const [original] = await canvas.findAllByText(String(args.children));
        await userEvent.hover(canvas.getByTestId('marquee'));
        await expectToMove(original!);
    },
};

export const SharedStates: Story = {
    args: {
        children: (
            <>
                <Link href="#track" underline="always">
                    Paper Satellites
                </Link>{' '}
                <span>(Northern Static Remix)</span>
                {' · '}
                {/* The link takes its colour from the span, so a hover can turn it white. */}
                <span className="text-subdued">
                    <Link href="#artist" underline="always">
                        The Quiet Hours
                    </Link>
                </span>
            </>
        ),
    },
    play: async ({ canvas, userEvent, step }) => {
        const marquee = canvas.getByTestId('marquee');
        const artists = await waitFor(() => {
            const links = within(marquee).getAllByText('The Quiet Hours');
            expect(links).toHaveLength(2);
            return links;
        });
        const [original, copy] = artists;

        await step('A hover on a copy shows on the original too', async () => {
            const colour = getComputedStyle(original!).color;
            await userEvent.hover(copy!);
            await waitFor(() =>
                expect(getComputedStyle(original!).color).not.toBe(colour)
            );
            await userEvent.unhover(copy!);
        });

        await step('Tab reaches each link once', async () => {
            await userEvent.tab();
            await expect(
                canvas.getByRole('link', { name: /Paper Satellites/ })
            ).toHaveFocus();
            await userEvent.tab();
            await expect(original).toHaveFocus();
            await userEvent.tab();
            await expect(marquee).not.toContainElement(
                document.activeElement as HTMLElement
            );
        });

        await step('A selection in a copy shows in the original', async () => {
            const [, remix] = within(marquee).getAllByText(
                '(Northern Static Remix)'
            );
            await userEvent.pointer([
                { target: remix!, offset: 1, keys: '[MouseLeft>]' },
                { target: remix!, offset: 9 },
                { keys: '[/MouseLeft]' },
            ]);
            await waitFor(() =>
                expect(CSS.highlights.get('copy-selection')?.size).toBe(1)
            );
        });
    },
};
