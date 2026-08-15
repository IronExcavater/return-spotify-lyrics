import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from '@return-spotify-lyrics/ui/Slider';

const meta = {
    title: 'UI/Forms/Slider',
    component: Slider,
    args: { label: 'Volume', defaultValue: 65, min: 0, max: 100 },
    decorators: [(Story) => <div className="w-72"><Story /></div>],
    parameters: { docs: { description: { component: 'Accessible Base UI slider with a required label for the thumb.' } } },
} satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
