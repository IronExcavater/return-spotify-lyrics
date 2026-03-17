import { memo, type ReactNode } from 'react';
import { Button, Flex, Text } from '@radix-ui/themes';
import clsx from 'clsx';

import {
    useMediaSectionEditor,
    type MediaSectionEditor,
} from '../hooks/useMediaSectionEditor';
import { useSectionHeader } from '../hooks/useSectionHeader';
import type { MediaSectionState } from '../types/mediaSection';
import { MediaRow } from './MediaRow';
import { MediaSectionEditControls } from './MediaSectionEditControls';
import { MediaSectionHeader } from './MediaSectionHeader';
import { MediaShelf, type MediaShelfItem } from './MediaShelf';

export type { MediaSectionState } from '../types/mediaSection';

const DEFAULT_HEADER_FADE_BLEED_PX = 8;

interface Props {
    section: MediaSectionState;
    editing: boolean;
    loading?: boolean;
    onChange: (id: string, patch: Partial<MediaSectionState>) => void;
    onDelete?: (id: string) => void;
    onReorderItems?: (id: string, next: MediaShelfItem[]) => void;
    onLoadMore?: (id: string) => void;
    onTitleClick?: () => void;
    renderContent?: (context: {
        columnWidth?: number;
        loading: boolean;
    }) => ReactNode;
    headerRight?: ReactNode;
    stickyHeader?: boolean;
    headerFade?: boolean;
    headerFadeBleed?: number;
    className?: string;
    dragging?: boolean;
    headerLoading?: boolean;
    errorMessage?: string | null;
    onRetry?: (id: string) => void;
}

function renderSectionContent(
    section: MediaSectionState,
    editor: MediaSectionEditor,
    editing: boolean,
    renderContent: Props['renderContent'],
    onLoadMore: Props['onLoadMore'],
    onReorderItems: Props['onReorderItems']
) {
    if (renderContent) {
        return renderContent({
            columnWidth: editor.columnWidth,
            loading: editor.isPending,
        });
    }

    return (
        <MediaShelf
            droppableId={`media-shelf-${section.id}`}
            items={editor.shelfItems as MediaShelfItem[]}
            variant={editor.variant === 'tile' ? 'tile' : 'list'}
            orientation={editor.orientation}
            itemsPerColumn={editor.itemsPerColumn}
            wideColumns={section.wideColumns}
            columnWidth={editor.columnWidth}
            maxVisible={editor.maxVisible}
            fixedHeight={editor.fixedHeight}
            cardSize={section.cardSize}
            trackSubtitleMode={section.trackSubtitleMode}
            hasMore={editor.isPending ? false : section.hasMore}
            loadingMore={editor.isPending ? false : section.loadingMore}
            showImage={section.showImage}
            onLoadMore={
                editor.isPending || !onLoadMore
                    ? undefined
                    : () => onLoadMore(section.id)
            }
            onReorder={
                onReorderItems
                    ? (next) => onReorderItems(section.id, next)
                    : undefined
            }
            interactive={!editing}
            draggable={false}
            itemLoading={editor.isPending}
        />
    );
}

function MediaSectionImpl({
    section,
    editing,
    loading = false,
    onChange,
    onDelete,
    onReorderItems,
    onLoadMore,
    onTitleClick,
    renderContent,
    headerRight,
    stickyHeader = true,
    headerFade = true,
    headerFadeBleed = DEFAULT_HEADER_FADE_BLEED_PX,
    className,
    dragging = false,
    headerLoading = true,
    errorMessage = null,
    onRetry,
}: Props) {
    const editor = useMediaSectionEditor({
        section,
        editing,
        loading,
        errorMessage,
        onChange,
    });
    const headerLayout = useSectionHeader({
        headerFadeBleed,
        stickyHeader,
        dragging,
    });
    const content = renderSectionContent(
        section,
        editor,
        editing,
        renderContent,
        onLoadMore,
        onReorderItems
    );

    return (
        <div
            ref={headerLayout.sectionRef}
            className={clsx(
                'group/section rounded-2 bg-background relative isolate transition-all',
                editing && dragging && 'z-20',
                className
            )}
            data-dragging={dragging ? 'true' : 'false'}
        >
            <div className="pointer-events-none absolute -z-10 opacity-0">
                <Flex
                    ref={editor.measureStackRef}
                    direction="column"
                    gap="1"
                    style={{ width: 320 }}
                >
                    <div ref={editor.measureRowRef}>
                        <MediaRow
                            title="Measure row"
                            subtitle="Measure subtitle"
                        />
                    </div>
                </Flex>
            </div>
            <Flex direction="column" gap="1" className="relative z-0">
                <MediaSectionEditControls
                    editor={editor}
                    editing={editing}
                    title={section.title}
                    sectionId={section.id}
                    onChange={onChange}
                    onDelete={onDelete}
                />
                <MediaSectionHeader
                    title={section.title}
                    subtitle={section.subtitle}
                    loading={loading}
                    headerLoading={headerLoading}
                    onTitleClick={onTitleClick}
                    headerRight={headerRight}
                    stickyHeaderEnabled={headerLayout.stickyHeaderEnabled}
                    headerFade={headerFade}
                    headerFadeBleedPx={headerLayout.headerFadeBleedPx}
                    headerFadeEdgeMask={headerLayout.headerFadeEdgeMask}
                    headerRef={headerLayout.headerRef}
                />
                <div className="relative z-0">
                    <div
                        className={clsx(
                            editing && 'pointer-events-none select-none'
                        )}
                    >
                        {content}
                    </div>
                    <div
                        className={clsx(
                            'absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200',
                            errorMessage
                                ? 'opacity-100'
                                : 'pointer-events-none opacity-0'
                        )}
                        aria-hidden={!errorMessage}
                    >
                        <div
                            className={clsx(
                                'rounded-2 bg-panel-solid/85 text-1 text-gray-12 flex max-w-65 flex-col items-center gap-2 px-4 py-3 text-center shadow-sm backdrop-blur transition-[opacity,transform] duration-200',
                                errorMessage
                                    ? 'translate-y-0 opacity-100'
                                    : '-translate-y-1 opacity-0'
                            )}
                        >
                            <Text size="1" color="gray">
                                {errorMessage ?? 'Failed to load this section.'}
                            </Text>
                            {onRetry && (
                                <Button
                                    size="1"
                                    variant="soft"
                                    onClick={() => onRetry(section.id)}
                                    disabled={!errorMessage}
                                >
                                    Reload
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                {!loading && section.loadingMore && (
                    <div className="pointer-events-none absolute right-2 bottom-2 z-10">
                        <Flex
                            align="center"
                            gap="1"
                            className="bg-panel-solid/90 text-1 text-gray-12 rounded-full px-2 py-1.5 shadow-sm backdrop-blur"
                        >
                            <span className="bg-accent-9 h-2 w-2 animate-pulse rounded-full" />
                            Loading more
                        </Flex>
                    </div>
                )}
            </Flex>
            <div
                aria-hidden="true"
                className={clsx(
                    'rounded-2 ring-offset-background pointer-events-none absolute inset-0 z-0 ring-2 ring-transparent ring-offset-2 transition-shadow',
                    editing && 'group-hover/section:ring-accent-8!',
                    dragging && 'ring-accent-10!'
                )}
            />
        </div>
    );
}

const areMediaSectionPropsEqual = (prev: Props, next: Props) =>
    prev.section === next.section &&
    prev.editing === next.editing &&
    prev.loading === next.loading &&
    prev.dragging === next.dragging &&
    prev.headerLoading === next.headerLoading &&
    prev.errorMessage === next.errorMessage &&
    prev.className === next.className &&
    prev.stickyHeader === next.stickyHeader &&
    prev.headerFade === next.headerFade &&
    prev.headerFadeBleed === next.headerFadeBleed &&
    prev.headerRight === next.headerRight &&
    prev.onChange === next.onChange &&
    prev.onDelete === next.onDelete &&
    prev.onReorderItems === next.onReorderItems &&
    prev.onLoadMore === next.onLoadMore &&
    prev.onTitleClick === next.onTitleClick &&
    prev.renderContent === next.renderContent &&
    prev.onRetry === next.onRetry;

export const MediaSection = memo(MediaSectionImpl, areMediaSectionPropsEqual);
