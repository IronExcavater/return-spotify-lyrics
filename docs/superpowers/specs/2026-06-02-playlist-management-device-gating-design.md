# Playlist Management and Playback Device Gating Design

## Scope

This change improves playlist management, adds the Fluent Emoji 3D webfont
fallback, exposes Spotify Connect device swapping, and disables Premium-only
playback behavior when Spotify rejects it for the current account.

The following Spotify platform constraints are explicit:

- Named collaborator invite management is not exposed by the Spotify Web API.
  The extension provides an explanatory dialog and opens the playlist in
  Spotify for collaborator management.
- Spotify exposes playlist unfollowing rather than permanent playlist
  deletion. The extension labels the action "Remove from your playlists" and
  requires confirmation.
- Spotify supports replacing a playlist cover but does not expose an endpoint
  to restore the generated default cover. The extension supports add/change
  cover only.
- Spotify removed reliable subscription-product detection from `GET /me` in
  February 2026. Premium playback availability is learned from playback API
  responses rather than inferred from profile data.
- This phase does not embed the Spotify Web Playback SDK and does not create a
  hosted companion tab.

## Playlist Editing

Owned playlists and collaborative playlists expose inline editing in the
playlist detail view:

- The hero title becomes editable through an explicit edit action.
- The description section becomes editable inline. An empty editable playlist
  shows an "Add a description" prompt instead of omitting the section.
- Saving updates the local playlist detail state after
  `changePlaylistDetails` succeeds.
- Cancelling restores the last server-backed values.
- Existing track reordering, removal, and duplicate cleanup behavior remains
  unchanged.

The hero context menu adds playlist-specific actions:

- `Edit details`
- `Make public` or `Make private`
- `Enable collaboration` or `Disable collaboration`
- `Manage collaborators`
- `Add cover` or `Change cover`
- `Duplicate playlist`
- `Remove from your playlists`
- Existing generic sharing actions

Visibility and collaborative actions update one property at a time through
`changePlaylistDetails`, update local state after success, and log failures
without applying a stale optimistic value.

## Collaborator Handoff

`Manage collaborators` opens a dialog that explains Spotify invite management
is completed in Spotify. Its primary action opens the playlist's Spotify URL in
a new tab. The action is shown for playlists that the current user owns.

## Playlist Cover Upload

The playlist cover action opens a file picker accepting images. The selected
image is decoded in the extension page, drawn to a square canvas, encoded as
JPEG, and iteratively reduced in size or quality until its base64 payload fits
Spotify's 256 KB limit. The upload RPC sends the JPEG base64 body to Spotify's
playlist image endpoint.

The OAuth scope list adds `ugc-image-upload`, allowing the existing reconnect
gate to request reauthorization for previously connected users. After a
successful upload, the playlist is reloaded so the returned Spotify image URL
becomes the displayed hero and list cover.

There is no remove-cover action.

## Playlist Creation and Removal

Playlist creation is available from the playlist picker. A compact dialog
collects the playlist name and optional description. New playlists default to
private. After creation, the playlist catalog cache is invalidated or
refreshed so the new playlist appears in the picker.

Playlist removal is exposed from an owned playlist's hero menu. A confirmation
dialog clearly states the playlist will be removed from the user's Spotify
library. Confirming calls Spotify's unfollow endpoint and returns the route to
the previous view.

## Playlist Duplication

`Duplicate playlist` is available for playlist detail pages and album detail
pages. It creates a new private playlist owned by the current user and copies
the source track URIs in Spotify-sized batches of at most 100 items.

- Playlist duplication fetches every playlist item page before copying.
- Album duplication fetches every album track page before copying.
- Episode or unavailable entries without a usable Spotify track URI are
  skipped.
- The generated title is `Copy of <source title>`.
- The action reports completion or failure with the existing toast system.

## Fluent Emoji Font

Global styles import the hosted Fluent Emoji 3D stylesheet used by the sibling
`iotbay` project:

`https://ironexcavater.github.io/fluent-emoji-webfont/fonts/FluentEmoji3D-balanced-128px.css`

`'Fluent Emoji 3D'` is appended as a fallback in the body font stack. The
existing UI font remains the primary font.

## Playback Device Swapping

The expanded playback bar adds a Spotify Connect device picker:

- Opening the picker fetches available devices through the existing
  `getAvailableDevices` RPC.
- The active device is marked.
- Restricted devices are visible but disabled.
- Selecting an eligible inactive device calls the existing `transferPlayback`
  RPC, then refreshes device and playback state.
- Transfer failures are logged and surfaced through a toast.

No Web Playback SDK device is registered by this change.

## Premium Playback Capability

A shared external store tracks Premium playback availability as
`unknown | available | unavailable`.

- It starts as `unknown` for each extension session.
- A successful Premium-only playback read or mutation marks it `available`.
- A Spotify `403` response from a Premium-only playback operation marks it
  `unavailable`.
- Session logout resets it to `unknown`.
- Generic session failures and network failures do not mark the account as
  Free.

While capability is `unknown`, the extension can attempt supported read probes
and leaves existing playback controls usable until Spotify denies a
Premium-only operation. Once capability is `unavailable`, Premium-only
controls remain visible but disabled with a `Spotify Premium required`
tooltip.

Premium-only behavior includes:

- Play, pause, previous, next, seek, volume, shuffle, and repeat
- Play-now menu and hero actions
- Add-to-queue actions
- Queue mutation, clearing, and reordering
- Device transfer

Device listing remains available as a read-only operation when Spotify permits
it. Lyrics, browsing, search, sharing, Spotify links, saved-library actions,
and supported playlist management remain available.

## Architecture

Playlist-specific behavior stays in `PlaylistView` and focused supporting
components. Shared Spotify mutations are added to `spotifyRpc`. Generic media
actions accept playback capability so play and queue actions can be disabled
without hiding sharing or playlist-library actions.

The playback capability store is independent of React and is updated at the
Spotify messaging boundary. This ensures playback failures from any call site
consistently affect the full extension UI. `usePlayer`, media action builders,
queue views, and the expanded playback bar consume the same state.

## Error Handling

- Playlist mutations log failures and retain the last confirmed local state.
- Dialog actions disable repeated submission while requests are in flight.
- Cover upload validation rejects files that cannot be decoded or compressed
  below Spotify's limit and surfaces a danger toast.
- Playlist duplication surfaces a danger toast on failure and a success toast
  after all batches complete.
- Playback capability changes only on classified Spotify `403` errors.
- Device transfer failures preserve the current active device and surface a
  danger toast.

## Verification

The repository currently has no configured application test runner. Add
focused pure-function tests only where a lightweight test setup is justified,
especially for cover JPEG fitting, playback error classification, and URI
batching. Run:

- `npm run typecheck`
- `npm run eslint`
- `npm run stylelint`
- `npm run prettier`
- `npm run build`
