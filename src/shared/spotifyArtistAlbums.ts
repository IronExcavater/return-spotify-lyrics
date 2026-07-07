export const ARTIST_OWN_ALBUM_INCLUDE_GROUPS = 'album,single';
export const ARTIST_APPEARANCE_ALBUM_INCLUDE_GROUPS = 'album,single,appears_on';

export const resolveArtistAlbumIncludeGroups = (includeAppearances: boolean) =>
    includeAppearances
        ? ARTIST_APPEARANCE_ALBUM_INCLUDE_GROUPS
        : ARTIST_OWN_ALBUM_INCLUDE_GROUPS;
