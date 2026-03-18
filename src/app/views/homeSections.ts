import type { MediaSectionState } from '../components/MediaSection';
import homeSectionsJson from '../config/home-sections.json';

type HomeSectionTemplate = Omit<
    MediaSectionState,
    'items' | 'hasMore' | 'loadingMore'
>;

const HOME_SECTION_TEMPLATES = homeSectionsJson as HomeSectionTemplate[];

const toSectionState = (template: HomeSectionTemplate): MediaSectionState => ({
    ...template,
    items: [],
    hasMore: false,
    loadingMore: false,
});

export const buildHomeSections = (): MediaSectionState[] =>
    HOME_SECTION_TEMPLATES.map(toSectionState);
