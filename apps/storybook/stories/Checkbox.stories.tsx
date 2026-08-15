import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from '@return-spotify-lyrics/ui/Checkbox';

const meta = {
    title: 'UI/Forms/Checkbox',
    component: Checkbox,
    args: { label: 'Show explicit badges', description: 'Display explicit-content indicators on media.', defaultChecked: true, disabled: false },
    parameters: { docs: { description: { component: 'Accessible Base UI checkbox with optional label and supporting description.' } } },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
