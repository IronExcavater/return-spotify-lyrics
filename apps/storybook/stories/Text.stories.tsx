import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { BadgeCheck, Music } from '@return-spotify-lyrics/icons';
import Text from '@return-spotify-lyrics/ui/Text';

const BIO = `## About

**The Quiet Hours** make slow, warm songs about night drives and harbour towns.

- Debut album *Paper Satellites* out now
- Lyrics from [LRCLIB](https://lrclib.net)`;

const DESCRIPTION =
    'New music every Friday.<br>Cover: <a href="https://open.spotify.com/artist/1">Ada Vale</a> &amp; friends.';

const UNSAFE =
    '<p>Hi<script>document.title = "hacked"</script> <a href="javascript:alert(1)" onclick="alert(1)">there</a></p><img src="x" onerror="alert(1)">';

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

export const Markdown: Story = {
    render: () => (
        <Text format="markdown" className="w-72">
            {BIO}
        </Text>
    ),
    play: async ({ canvas }) => {
        // The formatter loads lazily, so the formatted text arrives a moment later.
        const link = await canvas.findByRole('link', { name: /LRCLIB/ });
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(
            canvas.getByRole('heading', { name: 'About' })
        ).toBeInTheDocument();
        await expect(canvas.getByText('The Quiet Hours').tagName).toBe(
            'STRONG'
        );
        await expect(canvas.getAllByRole('listitem')).toHaveLength(2);
    },
};

export const Html: Story = {
    render: () => (
        <Text format="html" tone="subdued" className="w-72">
            {DESCRIPTION}
        </Text>
    ),
    play: async ({ canvas }) => {
        await expect(
            await canvas.findByRole('link', { name: /Ada Vale/ })
        ).toHaveAttribute('href', 'https://open.spotify.com/artist/1');
        await expect(canvas.getByText(/& friends/)).toBeInTheDocument();
    },
};

export const UnsafeHtml: Story = {
    render: () => (
        <Text format="html" className="w-72" data-testid="unsafe">
            {UNSAFE}
        </Text>
    ),
    play: async ({ canvas }) => {
        const text = canvas.getByTestId('unsafe');
        await waitFor(() =>
            expect(text.querySelector('p')).toHaveTextContent('Hi there')
        );
        // The script, the event handlers, the image and the unsafe link are gone, and the words stay.
        await expect(text.querySelector('script, img, [onclick]')).toBeNull();
        await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    },
};

export const RichContent: Story = {
    render: () => (
        <Text
            className="w-72"
            content={{
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'Lights on the ' },
                            {
                                type: 'text',
                                text: 'water',
                                marks: [{ type: 'italic' }],
                            },
                        ],
                    },
                ],
            }}
        />
    ),
    play: async ({ canvas }) => {
        await expect((await canvas.findByText('water')).tagName).toBe('EM');
    },
};
