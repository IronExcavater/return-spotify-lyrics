/** Where a link goes: a route in the app, a site on the web, or something the browser handles, like `mailto:`. */
export type LinkKind = 'internal' | 'external' | 'other';

const SCHEME = /^[a-z][a-z\d+.-]*:/i;

/** Finds where a link goes, from its address and the origin of the page. */
export function findLinkKind(href: string, origin: string): LinkKind {
    const isRelative = !SCHEME.test(href) && !href.startsWith('//');
    if (isRelative) return href.startsWith('#') ? 'other' : 'internal';

    const url = URL.parse(href, origin);
    if (!url || !/^https?:$/.test(url.protocol)) return 'other';
    return url.origin === origin ? 'other' : 'external';
}
