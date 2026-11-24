import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { BadgeCheck, Music } from '@return-spotify-lyrics/icons';
import Text from '@return-spotify-lyrics/ui/Text';

const LYRIC =
    'Paper boats in the harbour, lights on the water, and we sail until the morning while the city falls asleep around us';

const meta = {
    title: 'Text',
    component: Text,
    // Size, weight and tone default to the variant's, so they start empty.
    args: {
        children: 'Paper Satellites',
        variant: 'body',
    },
    argTypes: {
        children: { control: 'text' },
        render: { control: false },
    },
    render: (args) => (
        <div className="w-72">
            <Text {...args} />
        </div>
    ),
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variants: Story = {
    render: () => (
        <div className="grid w-72 gap-2">
            <Text variant="title">Paper Satellites</Text>
            <Text variant="heading">Popular tracks</Text>
            <Text variant="body">The Quiet Hours</Text>
            <Text variant="caption">Album · 2026 · 11 songs</Text>
        </div>
    ),
    play: async ({ canvas }) => {
        // A title and a heading are real headings, so the page outline works.
        await expect(
            canvas.getByRole('heading', { level: 1, name: 'Paper Satellites' })
        ).toBeInTheDocument();
        await expect(
            canvas.getByRole('heading', { level: 2, name: 'Popular tracks' })
        ).toBeInTheDocument();
    },
};

export const Tones: Story = {
    render: () => (
        <div className="grid w-72 gap-1">
            {(
                [
                    'default',
                    'subdued',
                    'accent',
                    'negative',
                    'warning',
                    'info',
                ] as const
            ).map((tone) => (
                <Text key={tone} tone={tone}>
                    {tone}
                </Text>
            ))}
        </div>
    ),
};

export const LineClamp: Story = {
    args: { children: LYRIC, lineClamp: 2, variant: 'body' },
    play: async ({ canvas }) => {
        const text = canvas.getByText(LYRIC);
        // The text is cut on screen, but the element still holds all of it.
        await expect(text.scrollHeight).toBeGreaterThan(text.clientHeight);
        await expect(text).toHaveTextContent(LYRIC);
    },
};

export const InlineIcons: Story = {
    args: {
        variant: 'heading',
        children: (
            <>
                The Quiet Hours{' '}
                <BadgeCheck role="img" aria-label="Verified artist" />
            </>
        ),
    },
    play: async ({ canvas }) => {
        const icon = canvas.getByLabelText('Verified artist');
        const text = icon.closest('.text') as HTMLElement;
        const fontSize = parseFloat(getComputedStyle(text).fontSize);
        // The icon takes the text's size, so it sits on the line.
        await expect(
            Math.abs(icon.getBoundingClientRect().height - fontSize)
        ).toBeLessThanOrEqual(1);
    },
};

export const RightToLeft: Story = {
    args: { children: 'שירים על המים בלילה', variant: 'heading' },
    play: async ({ canvas }) => {
        const text = canvas.getByText('שירים על המים בלילה');
        await expect(text).toHaveAttribute('dir', 'auto');
        await expect(getComputedStyle(text).direction).toBe('rtl');
    },
};

export const LiteralStrings: Story = {
    render: () => (
        <div className="grid w-72 gap-1">
            <Text>*NSYNC</Text>
            <Text>Sunn O)))</Text>
            <Text>
                <Music aria-hidden /> **Not bold** and _not italic_
            </Text>
        </div>
    ),
    play: async ({ canvas }) => {
        // Plain text is never parsed, so names with markdown characters stay as they are.
        await expect(canvas.getByText('*NSYNC')).toBeInTheDocument();
        await expect(canvas.getByText('Sunn O)))')).toBeInTheDocument();
    },
};

export const AsHeading: Story = {
    args: {
        render: <h3 />,
        variant: 'heading',
        children: 'Made for you',
    },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('heading', { level: 3, name: 'Made for you' })
        ).toBeInTheDocument();
    },
};
