import type { ItemTypes, SearchResults } from '@spotify/web-api-ts-sdk';

import { sendSpotifyMessage } from '../../../shared/messaging';
import {
    SEARCH_LIMIT,
    type SearchContext,
    type SearchType,
} from '../../../shared/search';
import {
    buildSearchOffsets,
    mapSearchPage,
    mapSearchResults,
} from '../../utils/searchMapping';

export async function loadSearchResults({
    context,
    locale,
}: {
    context: SearchContext;
    locale: string;
}) {
    const result = (await sendSpotifyMessage('search', {
        query: context.query,
        types: context.types as ItemTypes[],
        limit: SEARCH_LIMIT,
    })) as SearchResults<ItemTypes[]>;

    return {
        ...mapSearchResults(result, locale),
        offsets: buildSearchOffsets(result, SEARCH_LIMIT),
    };
}

export async function loadSearchResultsPage({
    query,
    type,
    offset,
    locale,
}: {
    query: string;
    type: SearchType;
    offset: number;
    locale: string;
}) {
    const result = (await sendSpotifyMessage('search', {
        query,
        types: [type] as ItemTypes[],
        limit: SEARCH_LIMIT,
        offset,
    })) as SearchResults<[ItemTypes]>;

    return mapSearchPage({
        type,
        result,
        locale,
        offset,
        limit: SEARCH_LIMIT,
    });
}
