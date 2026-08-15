import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from '@return-spotify-lyrics/ui/Badge';
import { Button } from '@return-spotify-lyrics/ui/Button';

const meta = {
    title: 'UI/Feedback/Badge',
    component: Badge,
    parameters: {
        docs: { description: { component: 'Small status or count indicator that can stand alone or decorate another control.' } },
    },
    args: { content: '4', tone: 'accent', dot: false },
    argTypes: { tone: { control: 'select', options: ['accent', 'danger', 'muted'] } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const OnControl: Story = { render: (args) => <Badge {...args}><Button variant="outline">Inbox</Button></Badge> };
