import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from '@return-spotify-lyrics/ui/Separator';
import { Spinner } from '@return-spotify-lyrics/ui/Spinner';

const meta = { title: 'UI/Feedback/Spinner & Separator', parameters: { docs: { description: { component: 'Small display primitives that do not need behavioural wrappers.' } } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const SpinnerExample: Story = { render: () => <div className="flex items-center gap-3"><Spinner /><span>Loading playback</span></div> };
export const SeparatorExample: Story = { render: () => <div className="w-72 space-y-3"><div>Above</div><Separator /><div>Below</div></div> };
