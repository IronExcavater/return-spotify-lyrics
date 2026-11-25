import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import Checkbox from '@return-spotify-lyrics/ui/Checkbox';

const meta = {
    title: 'Checkbox',
    component: Checkbox,
    args: {
        label: 'Show lyrics in the side panel',
        indeterminate: false,
        disabled: false,
        onCheckedChange: fn(),
    },
    argTypes: {
        label: { control: 'text' },
    },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvas, userEvent, args }) => {
        const checkbox = canvas.getByRole('checkbox', {
            name: 'Show lyrics in the side panel',
        });

        // A click on the label toggles the box too.
        await userEvent.click(
            canvas.getByText('Show lyrics in the side panel')
        );
        await expect(checkbox).toHaveAttribute('aria-checked', 'true');

        await userEvent.keyboard(' ');
        await expect(checkbox).toHaveAttribute('aria-checked', 'false');
        await expect(checkbox).toHaveFocus();
        await expect(args.onCheckedChange).toHaveBeenCalledTimes(2);
    },
};

export const Checked: Story = {
    args: { defaultChecked: true },
};

/** Some of the items below it are checked, like tracks in a playlist. */
export const Indeterminate: Story = {
    args: { label: 'Select all tracks', indeterminate: true },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('checkbox', { name: 'Select all tracks' })
        ).toHaveAttribute('aria-checked', 'mixed');
    },
};

export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvas, userEvent, args }) => {
        const checkbox = canvas.getByRole('checkbox');

        await userEvent.click(
            canvas.getByText('Show lyrics in the side panel')
        );
        await expect(checkbox).toHaveAttribute('aria-checked', 'false');
        await expect(args.onCheckedChange).not.toHaveBeenCalled();
    },
};

// A checkbox with no label doesn't take the labelled args of meta.
export const WithoutLabel: StoryObj<typeof Checkbox> = {
    args: { label: undefined, 'aria-label': 'Select Glass Harbour' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('checkbox', { name: 'Select Glass Harbour' })
        ).toBeInTheDocument();
    },
};

/** The label is part of the control, so every prop, like a pointer handler, reaches the element a person points at. */
export const PropsReachTheRoot: Story = {
    args: { onPointerEnter: fn() },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.hover(
            canvas.getByText('Show lyrics in the side panel')
        );
        await expect(args.onPointerEnter).toHaveBeenCalled();
    },
};
