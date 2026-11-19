import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import Portal from '@return-spotify-lyrics/ui/Portal';

const meta = {
    title: 'Portal',
    component: Portal,
    // The container comes from the render function, so the story has no args to set.
    args: {},
    render: function Render(args) {
        const [container, setContainer] = useState<HTMLElement | null>(null);

        return (
            <div className="grid gap-3 text-medium">
                <div className="rounded-medium bg-raised p-3">
                    The portal is written in this box.
                    {container && (
                        <Portal {...args} container={container}>
                            <p className="text-accent">The portal content</p>
                        </Portal>
                    )}
                </div>
                <div
                    ref={setContainer}
                    className="rounded-medium border border-dashed p-3"
                >
                    It shows in this box.
                </div>
            </div>
        );
    },
} satisfies Meta<typeof Portal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const IntoContainer: Story = {};
