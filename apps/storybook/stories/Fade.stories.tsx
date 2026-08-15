import type { Meta, StoryObj } from '@storybook/react-vite';
import { Fade } from '@return-spotify-lyrics/ui/Fade';

const meta = {
    title: 'UI/Layout/Fade',
    component: Fade,
    args: {
        fade: 'all',
        size: 24,
        enabled: true,
        className: 'size-64 rounded-panel',
        children: (
            <div className="size-full bg-[radial-gradient(circle_at_center,var(--color-accent),var(--color-surface-raised)_65%)]" />
        ),
    },
    argTypes: {
        fade: {
            control: 'select',
            options: [
                'none',
                'left',
                'right',
                'top',
                'bottom',
                'horizontal',
                'vertical',
                'all',
            ],
        },
        children: { control: false },
        grow: { control: false },
    },
    parameters: {
        docs: {
            description: {
                component:
                    'Directional mask fade supporting every edge, both axes, four-sided omni fading, and rounded/circular containers through normal border radius.',
            },
        },
    },
} satisfies Meta<typeof Fade>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Circle: Story = {
    args: { className: 'size-64 rounded-full', fade: 'all', size: 36 },
};
