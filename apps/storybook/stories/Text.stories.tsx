import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { BadgeCheck } from '@return-spotify-lyrics/icons';
import Text from '@return-spotify-lyrics/ui/Text';

const meta = {
    title: 'Text',
    component: Text,
    args: {
        children: '_Hidden Track_',
        inline: false,
    },
    argTypes: {
        children: { control: 'text' },
        render: { control: false },
    },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Plain text is never parsed, so a name that looks like markdown stays as it is. */
export const Plain: Story = {
    play: async ({ canvas, args }) => {
        const text = canvas.getByText(String(args.children));
        await expect(text.querySelector('em')).toBeNull();
    },
};

/** Text has no typography props, so an element and classes make a heading, with a verified mark at the text's size. */
export const ArtistHeading: Story = {
    args: {
        render: <h2 />,
        className: 'text-x-large font-bold',
        children: (
            <>
                The Quiet Hours{' '}
                <BadgeCheck role="img" aria-label="Verified artist" />
            </>
        ),
    },
    play: async ({ canvas }) => {
        const heading = canvas.getByRole('heading', { level: 2 });
        await expect(heading).toHaveStyle({
            fontSize: '24px',
            fontWeight: '700',
        });
        const icon = canvas.getByLabelText('Verified artist');
        const fontSize = parseFloat(getComputedStyle(icon).fontSize);
        await expect(
            Math.abs(icon.getBoundingClientRect().height - fontSize)
        ).toBeLessThanOrEqual(1);
    },
};

/** A lyric preview stops at two lines, and assistive technology still gets every word. */
export const MaxLines: Story = {
    args: {
        children:
            'Paper boats in the harbour, lights on the water, and we sail until the morning while the city falls asleep around us',
        maxLines: 2,
        className: 'w-72 text-subdued',
    },
    play: async ({ canvas, args }) => {
        const lyric = String(args.children);
        const text = canvas.getByText(lyric);
        await expect(text.scrollHeight).toBeGreaterThan(text.clientHeight);
        await expect(text).toHaveTextContent(lyric);
    },
};

/** Each Text finds its own direction, so a Hebrew lyric reads right to left on a left-to-right page. */
export const RightToLeft: Story = {
    args: { children: 'שירים על המים בלילה', className: 'text-large' },
    play: async ({ canvas, args }) => {
        const text = canvas.getByText(String(args.children));
        await expect(text).toHaveAttribute('dir', 'auto');
        await expect(getComputedStyle(text).direction).toBe('rtl');
    },
};

/** An artist bio in markdown, with a heading, bold, italic, a list and a link that opens in a new tab. */
export const Markdown: Story = {
    args: {
        format: 'markdown',
        children: `## About

**The Quiet Hours** make slow, warm songs about night drives and harbour towns.

- Debut album *Paper Satellites* out now
- Lyrics from [LRCLIB](https://lrclib.net)`,
        className: 'w-72',
    },
    play: async ({ canvas }) => {
        // The formatter loads lazily, and its first load can take more than a second on a cold server.
        const link = await canvas.findByRole(
            'link',
            { name: /LRCLIB/ },
            { timeout: 5000 }
        );
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

/** A playlist description from the Spotify API, in HTML. Safe tags and links stay, and scripts and unsafe links go. */
export const Html: Story = {
    args: {
        format: 'html',
        children:
            'New music every Friday.<br>Cover: <a href="https://open.spotify.com/artist/1">Ada Vale</a> &amp; friends.<script>document.title = "hacked"</script> <a href="javascript:alert(1)" onclick="alert(1)">Win a prize</a><img src="x" onerror="alert(1)">',
        className: 'w-72 text-subdued',
    },
    // The root has no role, so the story gives it a test id.
    render: (args) => <Text {...args} data-testid="description" />,
    play: async ({ canvas, step }) => {
        await step('A safe link stays a link', async () => {
            await expect(
                await canvas.findByRole(
                    'link',
                    { name: /Ada Vale/ },
                    { timeout: 5000 }
                )
            ).toHaveAttribute('href', 'https://open.spotify.com/artist/1');
        });

        await step('Scripts, handlers and unsafe links are gone', async () => {
            const text = canvas.getByTestId('description');
            await expect(
                text.querySelector('script, img, [onclick]')
            ).toBeNull();
            await expect(
                canvas.queryByRole('link', { name: 'Win a prize' })
            ).not.toBeInTheDocument();
            await expect(canvas.getByText(/Win a prize/)).toBeInTheDocument();
        });
    },
};

// A document takes the place of the children of meta.
export const Doc: StoryObj<typeof Text> = {
    args: {
        doc: {
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
        },
        children: undefined,
        format: undefined,
    },
    play: async ({ canvas }) => {
        await expect(
            (await canvas.findByText('water', {}, { timeout: 5000 })).tagName
        ).toBe('EM');
    },
};

/**
 * The name of a control keeps only inline formatting: a link becomes text, and blocks join into one line. It takes the
 * colour of the control around it.
 */
export const Inline: Story = {
    args: {
        inline: true,
        format: 'markdown',
        children:
            'Follow **Daft Punk**\n\non [Spotify](https://open.spotify.com)',
    },
    render: (args) => (
        <div data-testid="control" className="text-accent">
            <Text {...args} />
        </div>
    ),
    play: async ({ canvas }) => {
        // The formatter loads lazily, and the bold text shows that it has.
        const bold = await canvas.findByText(
            'Daft Punk',
            { selector: 'strong' },
            { timeout: 5000 }
        );
        const control = canvas.getByTestId('control');
        const text = control.firstElementChild as HTMLElement;
        await expect(text).toHaveTextContent('Follow Daft Punk on Spotify');
        await expect(text.tagName).toBe('SPAN');
        await expect(text.querySelector('p, div')).toBeNull();
        await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
        await waitFor(() =>
            expect(getComputedStyle(bold).color).toBe(
                getComputedStyle(control).color
            )
        );
    },
};

/**
 * The worst case: every format at once, in four scripts and both directions, with emoji, combining marks and a word
 * that never breaks, in a narrow box. Nothing may spill out of the box.
 */
export const EverythingAtOnce: Story = {
    args: {
        format: 'markdown',
        children: `## Ünïcödé · 歌词 · كلمات · מילים

**Bold _and italic_ together**, ~~struck~~, \`inline code\`, and [a link with a name so long that it has to wrap](https://lrclib.net/search?q=the+quiet+hours+paper+satellites+northern+static+remix).

Taumatawhakatangihangakoauauotamateaturipukakapikimaungahoronukupokaiwhenuakitanatahu is one word.

The chorus goes שירים על המים בלילה, then ليلة في الميناء, then 港の夜 before it ends.

👩‍👩‍👧‍👦 🏳️‍🌈 🧑🏽‍🚀 and Z̷̢a̶͙l̸̨g̵̣o̷͚ t̵̜e̴̙x̸̹t̶̲

1. A list item with **bold**
   - a nested item with \`code\`
   - a nested item with a [link](https://lrclib.net)
2. Another item

> A quote long enough to wrap, with *emphasis* and ~~a strike~~ inside it.`,
        className: 'w-64',
    },
    // The root has no role, so the story gives it a test id.
    render: (args) => <Text {...args} data-testid="everything" />,
    play: async ({ canvas, step }) => {
        // The formatter loads lazily, and its first load can take more than a second on a cold server.
        const link = await canvas.findByRole(
            'link',
            { name: /a name so long/ },
            { timeout: 5000 }
        );

        await step('Every block renders', async () => {
            await expect(link).toHaveAttribute('target', '_blank');
            await expect(
                canvas.getByRole('heading', { level: 2 })
            ).toBeVisible();
            await expect(canvas.getAllByRole('listitem')).toHaveLength(4);
            await expect(canvas.getByRole('blockquote')).toBeVisible();
        });

        await step('Nothing spills out of the box', async () => {
            const text = canvas.getByTestId('everything');
            await expect(text.scrollWidth).toBeLessThanOrEqual(
                text.clientWidth + 1
            );
        });
    },
};
