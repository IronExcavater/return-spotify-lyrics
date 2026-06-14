import { Cross2Icon } from '@radix-ui/react-icons';
import { Flex, IconButton } from '@radix-ui/themes';
import clsx from 'clsx';

import type { MediaSectionEditor } from '../../hooks/useMediaSectionEditor';
import type { MediaSectionState } from '../../types/mediaSection';
import {
    CardControlGroup,
    ClampControlGroup,
    LayoutControlGroup,
    TypeControlGroup,
    WidthControlGroup,
} from './editControls/ControlGroups';

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
    onChange,
    onDelete,
    sectionId,
    title,
}: Props) {
    const groupProps = {
        editor,
        editing,
        onChange,
        sectionId,
    };

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
                <TypeControlGroup {...groupProps} />
                <LayoutControlGroup {...groupProps} />
                <WidthControlGroup {...groupProps} />
                <ClampControlGroup {...groupProps} />
                <CardControlGroup {...groupProps} />

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
