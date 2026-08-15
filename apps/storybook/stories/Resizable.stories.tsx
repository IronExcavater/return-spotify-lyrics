import type { Meta, StoryObj } from '@storybook/react-vite';
import { Resizable } from '@return-spotify-lyrics/ui/Resizable';

const meta = {
    title: 'UI/Layout/Resizable',
    component: Resizable,
    args: {
        width: 320,
        height: 180,
        minWidth: 200,
        maxWidth: 520,
        minHeight: 120,
        maxHeight: 360,
        resize: 'both',
        handleSize: 6,
        activeHandleSize: 12,
        showIndicators: true,
        children: (
            <div className="flex size-full items-center justify-center rounded-panel border border-border bg-surface text-sm text-text-muted">
                Drag any enabled edge or corner
            </div>
        ),
    },
    argTypes: {
        resize: {
            control: 'select',
            options: ['both', 'horizontal', 'vertical', false],
        },
        handles: { control: false },
        disabledHandles: { control: false },
        target: { control: false },
        children: { control: false },
        onChange: { control: false },
        onChangeStart: { control: false },
        onChangeEnd: { control: false },
    },
    parameters: {
        docs: {
            description: {
                component:
                    'Storage-agnostic resizable container with eight independently controllable handles and visible active resize affordances.',
            },
        },
    },
} satisfies Meta<typeof Resizable>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const CornersOnly: Story = {
    args: { handles: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] },
};
