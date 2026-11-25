import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { BadgeCheck } from '@return-spotify-lyrics/icons';
import Text from '@return-spotify-lyrics/ui/Text';

// The first formatted story loads the formatter chunk, which can take more than a second on a cold server.
const LAZY_LOAD = { timeout: 5000 };

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

const DOC = {
    type: 'doc',
    content: [
        {
            type: 'paragraph',
            content: [
                { type: 'text', text: 'Lights on the ' },
                { type: 'text', text: 'water', marks: [{ type: 'italic' }] },
            ],
        },
    ],
};

const meta = {
    title: 'Text',
    component: Text,
    args: {
        children: 'Paper Satellites',
        inline: false,
    },
    argTypes: {
        children: { control: 'text' },
        render: { control: false },
    },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plain: Story = {};

/** Text has no typography props, so classes set the size, weight and colour case by case. */
export const WithClasses: Story = {
    args: { className: 'text-x-large font-bold text-subdued' },
    play: async ({ canvas }) => {
        const text = canvas.getByText('Paper Satellites');
        await expect(text).toHaveStyle({ fontSize: '24px', fontWeight: '700' });
    },
};

export const AsHeading: Story = {
    args: {
        render: <h2 />,
        className: 'text-x-large font-bold',
        children: 'Made for you',
    },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('heading', { level: 2, name: 'Made for you' })
        ).toBeInTheDocument();
    },
};

// The parent sets a colour, so the story can show that Text takes it.
export const TakesParentColour: Story = {
    render: (args) => (
        <div data-testid="parent" className="text-accent">
            <Text {...args} />
        </div>
    ),
    play: async ({ canvas }) => {
        await expect(
            getComputedStyle(canvas.getByText('Paper Satellites')).color
        ).toBe(getComputedStyle(canvas.getByTestId('parent')).color);
    },
};

export const MaxLines: Story = {
    args: { children: LYRIC, maxLines: 2, className: 'w-72' },
    play: async ({ canvas }) => {
        const text = canvas.getByText(LYRIC);
        // The text is cut on screen, but the element still holds all of it.
        await expect(text.scrollHeight).toBeGreaterThan(text.clientHeight);
        await expect(text).toHaveTextContent(LYRIC);
    },
};

export const InlineIcons: Story = {
    args: {
        className: 'text-x-large font-bold',
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
    args: { children: 'שירים על המים בלילה' },
    play: async ({ canvas }) => {
        const text = canvas.getByText('שירים על המים בלילה');
        await expect(text).toHaveAttribute('dir', 'auto');
        await expect(getComputedStyle(text).direction).toBe('rtl');
    },
};

export const LiteralStrings: Story = {
    args: { children: '*NSYNC, Sunn O))) and **not bold**' },
    play: async ({ canvas }) => {
        // Plain text is never parsed, so names with markdown characters stay as they are.
        await expect(
            canvas.getByText('*NSYNC, Sunn O))) and **not bold**')
        ).toBeInTheDocument();
    },
};

export const Markdown: Story = {
    args: { format: 'markdown', children: BIO, className: 'w-72' },
    play: async ({ canvas }) => {
        // The formatter loads lazily, so the formatted text arrives a moment later.
        const link = await canvas.findByRole(
            'link',
            { name: /LRCLIB/ },
            LAZY_LOAD
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

export const Html: Story = {
    args: {
        format: 'html',
        children: DESCRIPTION,
        className: 'w-72 text-subdued',
    },
    play: async ({ canvas }) => {
        await expect(
            await canvas.findByRole('link', { name: /Ada Vale/ }, LAZY_LOAD)
        ).toHaveAttribute('href', 'https://open.spotify.com/artist/1');
        await expect(canvas.getByText(/& friends/)).toBeInTheDocument();
    },
};

export const UnsafeHtml: Story = {
    args: { format: 'html', children: UNSAFE },
    // The root has no role, so the story gives it a test id.
    render: (args) => <Text {...args} data-testid="unsafe" />,
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

// A document takes the place of the children and the format of meta.
export const Doc: StoryObj<typeof Text> = {
    args: { doc: DOC, children: undefined, format: undefined },
    play: async ({ canvas }) => {
        await expect(
            (await canvas.findByText('water', {}, LAZY_LOAD)).tagName
        ).toBe('EM');
    },
};

/** The name of a control keeps only inline formatting, so a link becomes text and blocks join into one line. */
export const Inline: Story = {
    args: {
        inline: true,
        format: 'markdown',
        children:
            'Follow **Daft Punk**\n\non [Spotify](https://open.spotify.com)',
    },
    // The root has no role, so the story gives it a test id.
    render: (args) => <Text {...args} data-testid="inline" />,
    play: async ({ canvas }) => {
        // The formatter loads lazily, and the bold text shows that it has.
        await canvas.findByText('Daft Punk', { selector: 'strong' }, LAZY_LOAD);
        const text = canvas.getByTestId('inline');
        await expect(text).toHaveTextContent('Follow Daft Punk on Spotify');
        await expect(text.tagName).toBe('SPAN');
        await expect(text.querySelector('p, div')).toBeNull();
        await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    },
};
