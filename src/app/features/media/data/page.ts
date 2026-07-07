type PageProgressInput = {
    itemCount: number;
    offset: number;
    total?: number | null;
};

export function getPageProgress({
    itemCount,
    offset,
    total,
}: PageProgressInput) {
    const nextOffset = offset + itemCount;

    return {
        hasMore: nextOffset < (total ?? nextOffset),
        nextOffset,
    };
}
