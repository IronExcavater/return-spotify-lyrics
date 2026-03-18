import type { ReactNode, RefObject } from 'react';
import {
    ColumnsIcon,
    Cross2Icon,
    GridIcon,
    RowsIcon,
} from '@radix-ui/react-icons';
import { Button, DropdownMenu, Flex, IconButton, Text } from '@radix-ui/themes';
import clsx from 'clsx';

import { handleMenuTriggerKeyDown } from '../hooks/useActions';
import { LIMITS_BY_MODE, clampCount } from '../hooks/useMediaSectionEditor';
import type {
    ControlGroupId,
    MediaSectionEditor,
} from '../hooks/useMediaSectionEditor';
import type { MediaSectionState } from '../types/mediaSection';
import { SegmentedControl } from './SegmentedControl';
import { StepperControl } from './StepperControl';
import { TextButton } from './TextButton';

type ControlGroupProps = {
    id: ControlGroupId;
    label: string;
    activeGroup: ControlGroupId | null;
    groupWidth: number;
    controlsRef: RefObject<HTMLDivElement | null>;
    labelRef: RefObject<HTMLButtonElement | null>;
    onToggle: () => void;
    disableTransition: boolean;
    disabled: boolean;
    children: ReactNode;
};

function ControlGroup({
    id,
    label,
    activeGroup,
    groupWidth,
    controlsRef,
    labelRef,
    onToggle,
    disableTransition,
    disabled,
    children,
}: ControlGroupProps) {
    const isActive = activeGroup === id;
    const transitionClass = disableTransition
        ? 'transition-none'
        : 'transition-all';

    return (
        <div
            className={clsx(
                'relative flex min-w-0 items-center',
                disableTransition ? 'transition-none' : 'transition-[width]'
            )}
            style={{ width: groupWidth || undefined }}
        >
            <div
                ref={controlsRef}
                className={clsx(
                    transitionClass,
                    isActive
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none absolute -translate-y-1 opacity-0'
                )}
            >
                {children}
            </div>
            <div
                className={clsx(
                    transitionClass,
                    isActive
                        ? 'pointer-events-none absolute translate-y-1 opacity-0'
                        : 'translate-y-0 opacity-100'
                )}
            >
                <TextButton
                    ref={labelRef}
                    size="2"
                    weight="medium"
                    onClick={onToggle}
                    buttonClassName="px-0.5 py-0.5"
                    disabled={disabled}
                >
                    {label}
                </TextButton>
            </div>
        </div>
    );
}

function ControlSeparator() {
    return (
        <Text size="1" color="gray" mx="1">
            |
        </Text>
    );
}

type Props = {
    editor: MediaSectionEditor;
    editing: boolean;
    title: string;
    sectionId: string;
    onChange: (id: string, patch: Partial<MediaSectionState>) => void;
    onDelete?: (id: string) => void;
};

export function MediaSectionEditControls({
    editor,
    editing,
    title,
    sectionId,
    onChange,
    onDelete,
}: Props) {
    return (
        <div
            className={clsx(
                'absolute top-0 right-0 z-20 flex justify-end',
                editor.skipEditTransition
                    ? 'transition-none'
                    : 'transition-[opacity,transform]',
                editing
                    ? 'pointer-events-auto translate-y-0 opacity-100'
                    : 'pointer-events-none -translate-y-1 opacity-0'
            )}
        >
            <Flex
                align="center"
                direction="row"
                wrap="nowrap"
                gap="0.5"
                p="1"
                className={clsx(
                    'bg-panel-solid/90 min-h-9 rounded-full shadow-sm backdrop-blur',
                    editor.skipEditTransition
                        ? 'transition-none'
                        : 'transition-[opacity,width,transform]',
                    editing
                        ? 'translate-y-0 opacity-100'
                        : '-translate-y-1 opacity-0'
                )}
                onMouseDownCapture={(event) =>
                    editor.onEditControlsMouseDownCapture(event.target)
                }
            >
                <ControlGroup
                    id="type"
                    label="Type"
                    activeGroup={editor.activeGroup}
                    groupWidth={editor.groupWidths.type}
                    controlsRef={editor.typeControlsRef}
                    labelRef={editor.typeLabelRef}
                    onToggle={() => editor.toggleGroup('type')}
                    disableTransition={editor.skipEditTransition}
                    disabled={!editing}
                >
                    <Flex align="center" direction="row" gap="1">
                        <SegmentedControl
                            items={[
                                {
                                    key: 'v-list',
                                    label: 'Vertical list',
                                    icon: <RowsIcon />,
                                },
                                {
                                    key: 'h-list',
                                    label: 'Horizontal list',
                                    icon: <ColumnsIcon />,
                                },
                                {
                                    key: 'card',
                                    label: 'Card',
                                    icon: <GridIcon />,
                                },
                            ]}
                            active={editor.mode}
                            orientation="horizontal"
                            onSelect={(viewNext) =>
                                onChange(sectionId, {
                                    view: viewNext === 'card' ? 'card' : 'list',
                                    infinite:
                                        viewNext === 'card'
                                            ? 'columns'
                                            : viewNext === 'h-list'
                                              ? 'columns'
                                              : null,
                                    columns: viewNext === 'v-list' ? 1 : 0,
                                    rows:
                                        viewNext === 'v-list'
                                            ? 0
                                            : LIMITS_BY_MODE[viewNext].rows.min,
                                })
                            }
                            disabled={!editing}
                        />
                    </Flex>
                </ControlGroup>
                <ControlSeparator />
                <ControlGroup
                    id="layout"
                    label="Layout"
                    activeGroup={editor.activeGroup}
                    groupWidth={editor.groupWidths.layout}
                    controlsRef={editor.layoutControlsRef}
                    labelRef={editor.layoutLabelRef}
                    onToggle={() => editor.toggleGroup('layout')}
                    disableTransition={editor.skipEditTransition}
                    disabled={!editing}
                >
                    <Flex align="center" direction="row" wrap="nowrap" gap="2">
                        <StepperControl
                            label="Rows"
                            value={editor.rowsDraft ?? editor.displayRowsStr}
                            placeholder={editor.defaultRowsPlaceholder}
                            onDecrement={() => {
                                editor.setRowsDraft(null);
                                const next =
                                    editor.rowLimits.allowInfinite &&
                                    editor.layoutRows === editor.rowLimits.min
                                        ? 0
                                        : clampCount(
                                              (editor.layoutRows || 0) - 1,
                                              editor.rowLimits
                                          );
                                onChange(sectionId, { rows: next });
                            }}
                            onIncrement={() => {
                                editor.setRowsDraft(null);
                                onChange(sectionId, {
                                    rows: clampCount(
                                        editor.layoutRows === 0
                                            ? 1
                                            : editor.layoutRows + 1,
                                        editor.rowLimits
                                    ),
                                });
                            }}
                            onValueChange={(value) =>
                                editor.changeCount(
                                    value,
                                    (next) =>
                                        clampCount(next, editor.rowLimits),
                                    editor.setRowsDraft,
                                    'rows'
                                )
                            }
                            onValueBlur={() =>
                                editor.blurCount(
                                    editor.rowsDraft,
                                    (next) =>
                                        clampCount(next, editor.rowLimits),
                                    editor.defaultRowsByMode,
                                    editor.setRowsDraft,
                                    'rows'
                                )
                            }
                            onValueFocus={() =>
                                editor.focusDraft(
                                    editor.displayRowsStr,
                                    editor.setRowsDraft
                                )
                            }
                            disabled={!editing}
                        />
                        {editor.mode !== 'v-list' && (
                            <StepperControl
                                label="Cols"
                                value={
                                    editor.colsDraft ?? editor.displayColsStr
                                }
                                placeholder={editor.defaultColsPlaceholder}
                                onDecrement={() => {
                                    editor.setColsDraft(null);
                                    const next =
                                        editor.colLimits.allowInfinite &&
                                        editor.layoutCols ===
                                            editor.colLimits.min
                                            ? 0
                                            : clampCount(
                                                  (editor.layoutCols || 0) - 1,
                                                  editor.colLimits
                                              );
                                    onChange(sectionId, { columns: next });
                                }}
                                onIncrement={() => {
                                    editor.setColsDraft(null);
                                    onChange(sectionId, {
                                        columns: clampCount(
                                            editor.layoutCols === 0
                                                ? 1
                                                : editor.layoutCols + 1,
                                            editor.colLimits
                                        ),
                                    });
                                }}
                                onValueChange={(value) =>
                                    editor.changeCount(
                                        value,
                                        (next) =>
                                            clampCount(next, editor.colLimits),
                                        editor.setColsDraft,
                                        'columns'
                                    )
                                }
                                onValueBlur={() =>
                                    editor.blurCount(
                                        editor.colsDraft,
                                        (next) =>
                                            clampCount(next, editor.colLimits),
                                        editor.defaultColsByMode,
                                        editor.setColsDraft,
                                        'columns'
                                    )
                                }
                                onValueFocus={() =>
                                    editor.focusDraft(
                                        editor.displayColsStr,
                                        editor.setColsDraft
                                    )
                                }
                                disabled={!editing}
                            />
                        )}
                    </Flex>
                </ControlGroup>
                {editor.mode === 'h-list' && (
                    <>
                        <ControlSeparator />
                        <ControlGroup
                            id="width"
                            label="Width"
                            activeGroup={editor.activeGroup}
                            groupWidth={editor.groupWidths.width}
                            controlsRef={editor.widthControlsRef}
                            labelRef={editor.widthLabelRef}
                            onToggle={() => editor.toggleGroup('width')}
                            disableTransition={editor.skipEditTransition}
                            disabled={!editing}
                        >
                            <StepperControl
                                label="Width"
                                value={
                                    editor.widthDraft ?? editor.displayWidthStr
                                }
                                placeholder={String(editor.defaultColumnWidth)}
                                hideSteppers
                                onDecrement={() => undefined}
                                onIncrement={() => undefined}
                                onValueChange={(value) => {
                                    editor.setWidthDraft(value);
                                    const parsed = editor.parseClamp(value);
                                    if (parsed === null) return;
                                    onChange(sectionId, {
                                        columnWidth:
                                            parsed === undefined
                                                ? editor.defaultColumnWidth
                                                : editor.clampColumnWidth(
                                                      parsed
                                                  ),
                                    });
                                }}
                                onValueBlur={() => {
                                    if (editor.widthDraft === null) return;
                                    const parsed = editor.parseClamp(
                                        editor.widthDraft
                                    );
                                    onChange(sectionId, {
                                        columnWidth:
                                            parsed !== null &&
                                            parsed !== undefined
                                                ? editor.clampColumnWidth(
                                                      parsed
                                                  )
                                                : editor.defaultColumnWidth,
                                    });
                                    editor.setWidthDraft(null);
                                }}
                                onValueFocus={() =>
                                    editor.focusDraft(
                                        editor.displayWidthStr,
                                        editor.setWidthDraft
                                    )
                                }
                                suffix={
                                    <Text
                                        size="1"
                                        color="gray"
                                        className="px-px"
                                    >
                                        px
                                    </Text>
                                }
                                disabled={!editing}
                            />
                        </ControlGroup>
                    </>
                )}
                {editor.mode === 'v-list' && (
                    <>
                        <ControlSeparator />
                        <ControlGroup
                            id="clamp"
                            label="Clamp"
                            activeGroup={editor.activeGroup}
                            groupWidth={editor.groupWidths.clamp}
                            controlsRef={editor.clampControlsRef}
                            labelRef={editor.clampLabelRef}
                            onToggle={() => editor.toggleGroup('clamp')}
                            disableTransition={editor.skipEditTransition}
                            disabled={!editing}
                        >
                            <StepperControl
                                label="Clamp"
                                value={
                                    editor.clampDraft ?? editor.displayClampStr
                                }
                                placeholder="∞"
                                hideSteppers
                                onDecrement={() => undefined}
                                onIncrement={() => undefined}
                                onValueChange={(value) => {
                                    editor.setClampDraft(value);
                                    const parsed = editor.parseClamp(value);
                                    if (parsed === null) return;
                                    onChange(sectionId, {
                                        rowHeight:
                                            parsed === undefined
                                                ? undefined
                                                : editor.clampUnit === 'items'
                                                  ? editor.clampClampRows(
                                                        parsed
                                                    )
                                                  : editor.clampClampPx(parsed),
                                        clampUnit: editor.clampUnit,
                                    });
                                }}
                                onValueBlur={() => {
                                    if (editor.clampDraft === null) return;
                                    const parsed = editor.parseClamp(
                                        editor.clampDraft
                                    );
                                    onChange(sectionId, {
                                        rowHeight:
                                            parsed === undefined ||
                                            parsed === null
                                                ? undefined
                                                : editor.clampUnit === 'items'
                                                  ? editor.clampClampRows(
                                                        parsed
                                                    )
                                                  : editor.clampClampPx(parsed),
                                        clampUnit: editor.clampUnit,
                                    });
                                    editor.setClampDraft(null);
                                }}
                                onValueFocus={() =>
                                    editor.setClampDraft(
                                        editor.displayClampStr === '∞'
                                            ? ''
                                            : editor.displayClampStr
                                    )
                                }
                                suffix={
                                    <DropdownMenu.Root modal={false}>
                                        <DropdownMenu.Trigger
                                            onKeyDown={handleMenuTriggerKeyDown}
                                        >
                                            <Button
                                                size="0"
                                                variant="ghost"
                                                radius="small"
                                                className="px-px!"
                                                disabled={!editing}
                                            >
                                                {editor.clampUnitLabel}
                                            </Button>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Content
                                            align="end"
                                            size="1"
                                        >
                                            <DropdownMenu.Item
                                                onSelect={() =>
                                                    editor.updateClampUnit('px')
                                                }
                                            >
                                                pixels
                                            </DropdownMenu.Item>
                                            <DropdownMenu.Item
                                                onSelect={() =>
                                                    editor.updateClampUnit(
                                                        'items'
                                                    )
                                                }
                                            >
                                                rows
                                            </DropdownMenu.Item>
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Root>
                                }
                                disabled={!editing}
                            />
                        </ControlGroup>
                    </>
                )}
                {editor.mode === 'card' && (
                    <>
                        <ControlSeparator />
                        <ControlGroup
                            id="card"
                            label="Card"
                            activeGroup={editor.activeGroup}
                            groupWidth={editor.groupWidths.card}
                            controlsRef={editor.cardControlsRef}
                            labelRef={editor.cardLabelRef}
                            onToggle={() => editor.toggleGroup('card')}
                            disableTransition={editor.skipEditTransition}
                            disabled={!editing}
                        >
                            <StepperControl
                                label="Size"
                                value={
                                    editor.cardSizeDraft ??
                                    editor.displayCardSizeStr
                                }
                                placeholder="2"
                                onDecrement={() => {
                                    editor.setCardSizeDraft(null);
                                    onChange(sectionId, {
                                        cardSize: Math.max(
                                            1,
                                            editor.cardSize - 1
                                        ) as 1 | 2 | 3,
                                    });
                                }}
                                onIncrement={() => {
                                    editor.setCardSizeDraft(null);
                                    onChange(sectionId, {
                                        cardSize: Math.min(
                                            3,
                                            editor.cardSize + 1
                                        ) as 1 | 2 | 3,
                                    });
                                }}
                                onValueChange={editor.changeCardSize}
                                onValueBlur={() =>
                                    editor.blurCardSize(editor.cardSizeDraft)
                                }
                                onValueFocus={() =>
                                    editor.focusDraft(
                                        editor.displayCardSizeStr,
                                        editor.setCardSizeDraft
                                    )
                                }
                                disabled={!editing}
                            />
                        </ControlGroup>
                    </>
                )}
                {onDelete && (
                    <IconButton
                        size="1"
                        variant="ghost"
                        radius="full"
                        color="red"
                        disabled={!editing}
                        onClick={() => onDelete(sectionId)}
                        aria-label={`Remove ${title}`}
                    >
                        <Cross2Icon />
                    </IconButton>
                )}
            </Flex>
        </div>
    );
}
