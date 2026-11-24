import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import Radio from '@return-spotify-lyrics/ui/Radio';
import RadioGroup from '@return-spotify-lyrics/ui/RadioGroup';

const SORT_ORDERS = [
    { value: 'recent', label: 'Recently added' },
    { value: 'title', label: 'Alphabetical' },
    { value: 'creator', label: 'Creator' },
] as const;

type SortOrder = (typeof SORT_ORDERS)[number]['value'];

const meta = {
    title: 'Radio',
    component: RadioGroup,
    subcomponents: { Radio },
    args: {
        label: 'Sort by',
        orientation: 'vertical',
        disabled: false,
    },
    argTypes: {
        label: { control: 'text' },
    },
    render: (args) => (
        <RadioGroup {...args} defaultValue="recent">
            {SORT_ORDERS.map((order) => (
                <Radio key={order.value} {...order} />
            ))}
        </RadioGroup>
    ),
} satisfies Meta<typeof RadioGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
    play: async ({ canvas, userEvent }) => {
        const group = canvas.getByRole('radiogroup', { name: 'Sort by' });
        const recent = canvas.getByRole('radio', { name: 'Recently added' });
        const title = canvas.getByRole('radio', { name: 'Alphabetical' });

        await expect(group).toBeInTheDocument();
        await userEvent.click(recent);
        // The arrow keys move focus and choose the next option, as the ARIA radio group pattern says.
        await userEvent.keyboard('{ArrowDown}');
        await expect(title).toHaveFocus();
        await expect(title).toHaveAttribute('aria-checked', 'true');
        await expect(recent).toHaveAttribute('aria-checked', 'false');
    },
};

export const Horizontal: Story = {
    args: { orientation: 'horizontal' },
    play: async ({ canvas, userEvent }) => {
        const recent = canvas.getByRole('radio', { name: 'Recently added' });
        const title = canvas.getByRole('radio', { name: 'Alphabetical' });

        // The options sit on one line.
        await expect(
            Math.abs(
                recent.getBoundingClientRect().top -
                    title.getBoundingClientRect().top
            )
        ).toBeLessThanOrEqual(1);

        await userEvent.click(recent);
        await userEvent.keyboard('{ArrowRight}');
        await expect(title).toHaveAttribute('aria-checked', 'true');
    },
};

export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvas, userEvent }) => {
        const title = canvas.getByRole('radio', { name: 'Alphabetical' });

        await userEvent.click(canvas.getByText('Alphabetical'));
        await expect(title).toHaveAttribute('aria-checked', 'false');
    },
};

function ControlledDemo() {
    const [order, setOrder] = useState<SortOrder>('recent');

    return (
        <div className="grid gap-3">
            <RadioGroup
                label="Sort by"
                value={order}
                onValueChange={(value) => setOrder(value)}
            >
                {SORT_ORDERS.map((option) => (
                    <Radio key={option.value} {...option} />
                ))}
            </RadioGroup>
            <p className="text-subdued">Sorted by {order}</p>
        </div>
    );
}

/** The group takes `value` and `onValueChange`, like every control in the app. */
export const Controlled: Story = {
    render: () => <ControlledDemo />,
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('radio', { name: 'Creator' }));
        await expect(canvas.getByText('Sorted by creator')).toBeInTheDocument();
    },
};
