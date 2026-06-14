import { PlusIcon } from '@radix-ui/react-icons';
import {
    AlertDialog,
    Button,
    DropdownMenu,
    Flex,
    IconButton,
    Switch,
    Text,
} from '@radix-ui/themes';
import clsx from 'clsx';

import type { MediaSectionState } from '../../components/media/MediaSection';
import { SkeletonText } from '../../components/SkeletonText';
import { handleMenuTriggerKeyDown } from '../../hooks/useActions';

type HomeViewHeaderProps = {
    heading: { title: string; subtitle: string };
    headingLoading: boolean;
    editing: boolean;
    isEditable: boolean;
    isSearching: boolean;
    availableHomeSections: MediaSectionState[];
    onEditingChange: (next: boolean) => void;
    onAddSection: (id: string) => void;
    onRestore: () => void;
};

export function HomeViewHeader({
    heading,
    headingLoading,
    editing,
    isEditable,
    isSearching,
    availableHomeSections,
    onEditingChange,
    onAddSection,
    onRestore,
}: HomeViewHeaderProps) {
    return (
        <Flex
            justify="between"
            direction="column"
            className={clsx('relative min-w-0', isEditable && 'bg-background')}
            ml="-3"
            mr="-1"
            pl="3"
            pr="1"
            py="1"
            mb={isEditable ? '4' : undefined}
        >
            <Flex>
                {!editing && (
                    <SkeletonText
                        loading={headingLoading}
                        preset="media-row"
                        variant="title"
                        fullWidth={false}
                        className="inline-flex"
                    >
                        <Text size="3" weight="bold">
                            {heading.title}
                        </Text>
                    </SkeletonText>
                )}

                {isEditable && (
                    <Flex align="center" gap="2" className="relative">
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger
                                onKeyDown={handleMenuTriggerKeyDown}
                            >
                                <IconButton
                                    size="1"
                                    variant="soft"
                                    color="green"
                                    radius="full"
                                    aria-label="Add section"
                                    disabled={
                                        availableHomeSections.length === 0
                                    }
                                >
                                    <PlusIcon />
                                </IconButton>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content size="1">
                                {availableHomeSections.length === 0 && (
                                    <DropdownMenu.Item disabled>
                                        All sections added
                                    </DropdownMenu.Item>
                                )}
                                {availableHomeSections.map((section) => (
                                    <DropdownMenu.Item
                                        key={section.id}
                                        onSelect={() =>
                                            onAddSection(section.id)
                                        }
                                    >
                                        {section.title}
                                    </DropdownMenu.Item>
                                ))}
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>

                        <AlertDialog.Root>
                            <AlertDialog.Trigger>
                                <Button size="1" variant="soft" color="red">
                                    Restore
                                </Button>
                            </AlertDialog.Trigger>
                            <AlertDialog.Content maxWidth="260px" size="1">
                                <AlertDialog.Title size="3">
                                    Revert home layout?
                                </AlertDialog.Title>
                                <AlertDialog.Description size="2">
                                    Restore the default shelves.
                                </AlertDialog.Description>
                                <Flex mt="3" justify="end" gap="2">
                                    <AlertDialog.Cancel>
                                        <Button variant="soft" size="1">
                                            Cancel
                                        </Button>
                                    </AlertDialog.Cancel>
                                    <AlertDialog.Action>
                                        <Button
                                            variant="soft"
                                            color="red"
                                            size="1"
                                            onClick={onRestore}
                                            autoFocus
                                        >
                                            Revert
                                        </Button>
                                    </AlertDialog.Action>
                                </Flex>
                            </AlertDialog.Content>
                        </AlertDialog.Root>
                    </Flex>
                )}

                {!isSearching && (
                    <Flex align="center" gap="1" ml="auto">
                        <Text size="1" color="gray">
                            Edit
                        </Text>
                        <Switch
                            size="1"
                            checked={isEditable}
                            onCheckedChange={onEditingChange}
                            aria-label="Toggle customise mode"
                        />
                    </Flex>
                )}

                {isEditable && (
                    <div className="from-background pointer-events-none absolute top-full right-0 left-0 z-0 h-4 bg-linear-to-b to-transparent" />
                )}
            </Flex>

            {!isEditable && (
                <SkeletonText
                    loading={headingLoading}
                    preset="media-row"
                    variant="subtitle"
                    fullWidth={false}
                    className="inline-flex"
                >
                    <Text size="1" color="gray">
                        {heading.subtitle}
                    </Text>
                </SkeletonText>
            )}
        </Flex>
    );
}
