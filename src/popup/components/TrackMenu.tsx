import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { DropdownMenu, IconButton } from '@radix-ui/themes';
import { sendSpotifyMessage } from '../../shared/messaging';

interface Props {
    trackUri?: string;
    albumId?: string;
    artistId?: string;
    onOpenMedia?: (type: 'album' | 'artist', id: string) => void;
}

export function TrackMenu({ trackUri, albumId, artistId, onOpenMedia }: Props) {
    const hasActions = trackUri || albumId || artistId;
    if (!hasActions) return null;

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <IconButton
                    size="1"
                    variant="ghost"
                    radius="full"
                    aria-label="Track options"
                    onClick={(event) => event.stopPropagation()}
                >
                    <DotsHorizontalIcon />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content size="1" variant="soft">
                {trackUri && (
                    <DropdownMenu.Item
                        onSelect={() => {
                            void sendSpotifyMessage('addToQueue', trackUri);
                        }}
                    >
                        Add to queue
                    </DropdownMenu.Item>
                )}
                {(albumId || artistId) && trackUri && (
                    <DropdownMenu.Separator />
                )}
                {albumId && (
                    <DropdownMenu.Item
                        onSelect={() => onOpenMedia?.('album', albumId)}
                    >
                        Go to album
                    </DropdownMenu.Item>
                )}
                {artistId && (
                    <DropdownMenu.Item
                        onSelect={() => onOpenMedia?.('artist', artistId)}
                    >
                        Go to artist
                    </DropdownMenu.Item>
                )}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
