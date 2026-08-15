import type { Meta, StoryObj } from '@storybook/react-vite';
import { Marquee } from '@return-spotify-lyrics/ui/Marquee';

const meta = {
    title: 'UI/Motion/Marquee',
    component: Marquee,
    decorators: [
        (Story) => (
            <div className="w-72 rounded-panel border border-border bg-surface p-3">
                <Story />
            </div>
        ),
    ],
    args: {
        children:
            'A deliberately long track title that demonstrates the marquee behaviour in a constrained container',
        mode: 'left',
        speed: 10,
        gap: 16,
        copies: 'auto',
        force: false,
        animateOnHover: false,
        pauseWhenOffscreen: true,
    },
    argTypes: {
        mode: { control: 'select', options: ['left', 'right', 'bounce'] },
        copies: { control: 'select', options: ['auto', 1, 2, 3, 4] },
        children: { control: 'text' },
    },
    parameters: {
        docs: {
            description: {
                component:
                    'Measured marquee with overflow detection, forced scrolling, fixed or automatic clone counts, bounce mode, hover activation, separators, and offscreen pausing.',
            },
        },
    },
} satisfies Meta<typeof Marquee>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const ForcedShortText: Story = {
    args: { children: 'Short title', force: true, copies: 3 },
};
export const Bounce: Story = { args: { mode: 'bounce', copies: 1 } };
