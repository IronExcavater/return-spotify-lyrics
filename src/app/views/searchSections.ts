import type { SearchType } from '../../shared/search';
import type { MediaSectionState } from '../components/MediaSection';
import searchSectionsJson from '../config/search-sections.json';

type SearchSectionTemplate = Omit<
    MediaSectionState,
    'items' | 'hasMore' | 'loadingMore'
>;

const SEARCH_SECTION_TEMPLATES = searchSectionsJson as Record<
    SearchType,
    SearchSectionTemplate
>;

const toSectionState = (
    template: SearchSectionTemplate
): MediaSectionState => ({
    ...template,
    items: [],
    hasMore: false,
    loadingMore: false,
});

export const SEARCH_SECTION_BASE: Record<SearchType, MediaSectionState> =
    Object.fromEntries(
        (Object.keys(SEARCH_SECTION_TEMPLATES) as SearchType[]).map((type) => [
            type,
            toSectionState(SEARCH_SECTION_TEMPLATES[type]),
        ])
    ) as Record<SearchType, MediaSectionState>;

export const buildSearchSections = (types: SearchType[]): MediaSectionState[] =>
    types.map((type) => toSectionState(SEARCH_SECTION_TEMPLATES[type]));
