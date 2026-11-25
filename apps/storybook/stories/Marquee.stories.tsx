import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Music } from '@return-spotify-lyrics/icons';
import Marquee from '@return-spotify-lyrics/ui/Marquee';

import { lengthControl } from './controls';

const LONG = 'Paper Satellites (Northern Static Remix) · The Quiet Hours';

// The links have an underline, because a link in text needs more than colour to stand out.
const LINK = 'underline underline-offset-2 hover:text-accent';
const SHORT = 'Slow Orbit';

const meta = {
    title: 'Marquee',
    component: Marquee,
    // The component defaults give every control a value. The delay and the rest depend on other props, so they start empty.
    args: {
        children: LONG,
        direction: 'left',
        motion: 'loop',
        fill: false,
        play: 'auto',
        speed: 40,
        gap: 24,
        fadeDepth: 24,
    },
    argTypes: {
        children: { control: 'text' },
        separator: { control: false },
        gap: lengthControl,
        fadeDepth: lengthControl,
    },
    render: (args) => (
        <div className="w-60 rounded-medium bg-raised px-3 py-2 text-medium">
            {/* A Marquee has no role, so the tests find it by its test ID. */}
            <Marquee {...args} data-testid="marquee" />
        </div>
    ),
} satisfies Meta<typeof Marquee>;

export default meta;

type Story = StoryObj<typeof meta>;

// The delay before the first pass is a second, so a move can take a little longer than that.
const MOVE_TIMEOUT = { timeout: 3000 };

function expectToMove(element: HTMLElement) {
    const start = element.getBoundingClientRect();
    return waitFor(() => {
        const { x, y } = element.getBoundingClientRect();
        expect(Math.hypot(x - start.x, y - start.y)).toBeGreaterThan(2);
    }, MOVE_TIMEOUT);
}

export const Overflow: Story = {
    play: async ({ canvas }) => {
        // The copy is hidden from assistive technology, so a person hears the text once.
        await waitFor(() => expect(canvas.getAllByText(LONG)).toHaveLength(2));
        const [original] = canvas.getAllByText(LONG);
        await expectToMove(original!);
    },
};

export const Fits: Story = {
    args: { children: SHORT },
    play: async ({ canvas }) => {
        await expect(canvas.getAllByText(SHORT)).toHaveLength(1);
    },
};

export const AlwaysLoop: Story = {
    args: { children: SHORT, fill: true },
    play: async ({ canvas }) => {
        // Short content needs several copies to fill the box with no gap.
        await waitFor(() =>
            expect(canvas.getAllByText(SHORT).length).toBeGreaterThan(2)
        );
        const [original] = canvas.getAllByText(SHORT);
        await expectToMove(original!);
    },
};

export const MovesRight: Story = {
    args: { direction: 'right' },
};

/** Up and down move the content through the height of the marquee, like lyrics. */
export const Vertical: Story = {
    args: { direction: 'up', className: 'h-5' },
    play: async ({ canvas }) => {
        await waitFor(() => expect(canvas.getAllByText(LONG)).toHaveLength(2));
        const [original] = canvas.getAllByText(LONG);
        await expectToMove(original!);
    },
};

/** A bounce rests at each end, and a loop waits only once before it starts. */
export const Bounce: Story = {
    args: { motion: 'bounce' },
    play: async ({ canvas }) => {
        const text = canvas.getByText(LONG);
        await expectToMove(text);
        await expect(canvas.getAllByText(LONG)).toHaveLength(1);
    },
};

export const StartOnHover: Story = {
    args: { play: 'hover' },
    play: async ({ canvas, userEvent }) => {
        const [original] = await canvas.findAllByText(LONG);
        await userEvent.hover(canvas.getByTestId('marquee'));
        await expectToMove(original!);
    },
};

export const SeparatorNode: Story = {
    args: {
        children: SHORT,
        fill: true,
        separator: <Music aria-hidden className="size-3 text-subdued" />,
    },
};

export const SharedStates: Story = {
    args: {
        children: (
            <>
                <a href="#track" className={LINK}>
                    Paper Satellites
                </a>{' '}
                <span>(Northern Static Remix)</span>
                {' · '}
                <a href="#artist" className={`text-subdued ${LINK}`}>
                    The Quiet Hours
                </a>
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
