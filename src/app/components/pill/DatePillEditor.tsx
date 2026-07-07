import {
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
} from 'react';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import { Flex, IconButton, Text } from '@radix-ui/themes';

import { InlineInput } from '../InlineInput';
import type { DateDraft, DateRangeValue, resolveEditPattern } from './date';

type DateWidths = {
    from: number;
    to: number;
};

type DateEditPattern = ReturnType<typeof resolveEditPattern>;

export function DatePillEditor({
    dateDraft,
    dateInputRef,
    dateWidths,
    editPattern,
    isRangeMode,
    onAddRange,
    onInputKeyDown,
    onRemoveRange,
    onUpdateRange,
    onUpdateSingleDate,
    placeholder,
}: {
    dateDraft: DateDraft;
    dateInputRef: RefObject<HTMLInputElement>;
    dateWidths: DateWidths;
    editPattern: DateEditPattern;
    isRangeMode: boolean;
    onAddRange: () => void;
    onInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
    onRemoveRange: () => void;
    onUpdateRange: (key: keyof DateRangeValue, rawValue: string) => void;
    onUpdateSingleDate: (rawValue: string) => void;
    placeholder: string;
}) {
    return (
        <Flex
            align="center"
            gap="1"
            className="flex-wrap"
            onClick={(event: ReactMouseEvent<HTMLDivElement>) =>
                event.stopPropagation()
            }
        >
            <InlineInput
                ref={dateInputRef}
                value={dateDraft.range.from ?? ''}
                onChange={(value) =>
                    isRangeMode
                        ? onUpdateRange('from', value)
                        : onUpdateSingleDate(value)
                }
                onKeyDown={onInputKeyDown}
                placeholder={placeholder || editPattern.placeholder}
                className="min-w-0 font-normal"
                style={
                    dateWidths.from
                        ? { width: `${dateWidths.from}px` }
                        : undefined
                }
            />

            {isRangeMode ? (
                <>
                    <Text size="1" color="gray">
                        to
                    </Text>
                    <InlineInput
                        value={dateDraft.range.to ?? ''}
                        onChange={(value) => onUpdateRange('to', value)}
                        onKeyDown={onInputKeyDown}
                        className="min-w-0 font-normal"
                        placeholder={placeholder || editPattern.placeholder}
                        style={
                            dateWidths.to
                                ? { width: `${dateWidths.to}px` }
                                : undefined
                        }
                    />
                    <IconButton
                        size="0"
                        variant="ghost"
                        radius="full"
                        color="gray"
                        className="bg-grayA-3 text-gray-12 hover:bg-grayA-4 h-4! min-h-0 w-4! min-w-0 shrink-0"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRemoveRange();
                        }}
                        aria-label="Remove end date"
                    >
                        <MinusIcon />
                    </IconButton>
                </>
            ) : (
                <IconButton
                    size="0"
                    variant="ghost"
                    radius="full"
                    color="gray"
                    className="bg-grayA-3 text-gray-12 hover:bg-grayA-4 h-4! min-h-0 w-4! min-w-0 shrink-0"
                    onClick={(event) => {
                        event.stopPropagation();
                        onAddRange();
                    }}
                    aria-label="Add end date"
                >
                    <PlusIcon />
                </IconButton>
            )}
        </Flex>
    );
}
