import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from '@return-spotify-lyrics/ui/Switch';

const meta = {
    title: 'UI/Forms/Switch',
    component: Switch,
    args: {
        label: 'Compact media',
        description: 'Use denser media rows where supported.',
        defaultChecked: true,
        disabled: false,
    },
    parameters: {
        docs: {
            description: {
                component:
                    'Accessible switch with an optional label and description.',
            },
        },
    },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
