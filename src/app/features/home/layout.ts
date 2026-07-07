import { getFromStorage, setInStorage } from '../../../shared/storage';
import type { MediaSectionState } from '../../components/media/MediaSection';
import { buildHomeSections } from './sections';

const HOME_LAYOUT_KEY = 'homeLayout';

export const ALWAYS_VISIBLE_HOME_SECTIONS = new Set([
    'user-playlists',
    'saved-tracks',
]);

type StoredHomeSection = Pick<
    MediaSectionState,
    | 'id'
    | 'title'
    | 'subtitle'
    | 'view'
    | 'columns'
    | 'rows'
    | 'infinite'
    | 'rowHeight'
    | 'columnWidth'
    | 'cardSize'
    | 'clampUnit'
>;

function stripHomeSection(section: MediaSectionState): StoredHomeSection {
    return {
        id: section.id,
        title: section.title,
        subtitle: section.subtitle,
        view: section.view,
        columns: section.columns,
        rows: section.rows,
        infinite: section.infinite,
        rowHeight: section.rowHeight,
        columnWidth: section.columnWidth,
        cardSize: section.cardSize,
        clampUnit: section.clampUnit,
    };
}

function sanitizeStoredSection(section: StoredHomeSection): StoredHomeSection {
    return stripHomeSection(section as MediaSectionState);
}

export function mergeHomeLayout(
    saved: StoredHomeSection[] | undefined
): MediaSectionState[] {
    const defaults = buildHomeSections();
    if (!saved?.length) return defaults;

    const byId = new Map(defaults.map((section) => [section.id, section]));
    const merged: MediaSectionState[] = [];

    saved
        .filter(
            (stored): stored is StoredHomeSection =>
                Boolean(stored) && typeof stored.id === 'string'
        )
        .map(sanitizeStoredSection)
        .forEach((stored) => {
            const base = byId.get(stored.id);
            if (!base) return;
            merged.push({ ...base, ...stored, items: [] });
            byId.delete(stored.id);
        });

    byId.forEach((section) => merged.push(section));
    return merged;
}

export async function readHomeLayout() {
    const saved = await getFromStorage<StoredHomeSection[]>(HOME_LAYOUT_KEY);
    return mergeHomeLayout(saved ?? undefined);
}

export async function saveHomeLayout(sections: MediaSectionState[]) {
    await setInStorage(HOME_LAYOUT_KEY, sections.map(stripHomeSection));
}
