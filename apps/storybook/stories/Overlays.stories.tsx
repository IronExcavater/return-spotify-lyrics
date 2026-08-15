import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@return-spotify-lyrics/ui/Button';
import { Dialog } from '@return-spotify-lyrics/ui/Dialog';
import { Menu } from '@return-spotify-lyrics/ui/Menu';
import { Popover } from '@return-spotify-lyrics/ui/Popover';
import { Tooltip } from '@return-spotify-lyrics/ui/Tooltip';

const meta = {
    title: 'UI/Overlays/Examples',
    parameters: {
        docs: {
            description: {
                component:
                    'Interactive examples for compound overlay primitives. Their behaviour comes from Base UI while this package owns the visual treatment.',
            },
        },
    },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const TooltipExample: Story = {
    render: () => (
        <Tooltip content="Open lyrics">
            <Button variant="outline">Hover me</Button>
        </Tooltip>
    ),
};
export const PopoverExample: Story = {
    render: () => (
        <Popover.Root>
            <Popover.Trigger
                render={<Button variant="outline">Open popover</Button>}
            />
            <Popover.Content>
                <Popover.Title className="font-semibold">
                    Playback device
                </Popover.Title>
                <Popover.Description className="mt-1 text-text-muted">
                    Choose where Spotify is currently playing.
                </Popover.Description>
            </Popover.Content>
        </Popover.Root>
    ),
};
export const DialogExample: Story = {
    render: () => (
        <Dialog.Root>
            <Dialog.Trigger render={<Button>Open dialog</Button>} />
            <Dialog.Content
                title="Reconnect Spotify"
                description="This example demonstrates the shared modal treatment."
            >
                <div className="flex justify-end">
                    <Dialog.Close
                        render={<Button variant="outline">Done</Button>}
                    />
                </div>
            </Dialog.Content>
        </Dialog.Root>
    ),
};
export const MenuExample: Story = {
    render: () => (
        <Menu.Root>
            <Menu.Trigger
                render={<Button variant="outline">Open menu</Button>}
            />
            <Menu.Content>
                <Menu.Item>View profile</Menu.Item>
                <Menu.Item>Settings</Menu.Item>
                <Menu.Separator />
                <Menu.Item>Sign out</Menu.Item>
            </Menu.Content>
        </Menu.Root>
    ),
};
