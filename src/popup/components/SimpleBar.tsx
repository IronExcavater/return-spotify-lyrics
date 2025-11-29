import { Flex, IconButton } from '@radix-ui/themes';
import { PauseIcon, PlayIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import { MdMusicNote } from 'react-icons/md';
import { SimplifiedArtist, SimplifiedShow } from '@spotify/web-api-ts-sdk';

import { usePlayer } from '../hooks/usePlayer';
import { asEpisode, asTrack } from '../../shared/types';

import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { ExternalLink } from './ExternalLink';
import { AvatarButton } from './AvatarButton';
import { AdvancedBar } from './AdvanceBar';

interface Props {
    expanded: boolean;
    setExpanded: (expanded: boolean) => void;
}

export function SimpleBar({ expanded, setExpanded }: Props) {
    const { playback, isPlaying, controls } = usePlayer();

    const track = asTrack(playback?.item);
    const episode = asEpisode(playback?.item);

    const title = playback?.item?.name ?? '';
    const link = playback?.item?.external_urls?.spotify;

    const artists: (SimplifiedArtist | SimplifiedShow)[] =
        track?.artists ?? (episode?.show ? [episode.show] : []);

    const albumImage =
        track?.album?.images?.[0]?.url ?? episode?.images?.[0]?.url;

    return (
        <Flex direction="column" gap="2" className="w-full select-none">
            <Flex align="center" gap="2" className="overflow-hidden">
                <AvatarButton
                    avatar={{
                        src: albumImage,
                        fallback: <MdMusicNote />,
                        radius: 'small',
                        onClick: isPlaying ? controls.pause : controls.play,
                    }}
                >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </AvatarButton>

                <Flex direction="column" flexGrow="1" overflow="hidden">
                    <Fade>
                        <Marquee mode="bounce">
                            <ExternalLink
                                noAccent
                                size="3"
                                weight="bold"
                                href={link}
                            >
                                {title}
                            </ExternalLink>
                        </Marquee>
                    </Fade>

                    <Fade>
                        <Marquee mode="right">
                            {artists.map((artist) => {
                                const label =
                                    'publisher' in artist
                                        ? artist.publisher
                                        : artist.name;

                                return (
                                    <ExternalLink
                                        noAccent
                                        size="2"
                                        href={artist?.external_urls?.spotify}
                                    >
                                        {label}
                                    </ExternalLink>
                                );
                            })}
                        </Marquee>
                    </Fade>
                </Flex>

                <IconButton
                    variant="ghost"
                    radius="full"
                    size="1"
                    onClick={() => setExpanded(!expanded)}
                >
                    <DotsHorizontalIcon />
                </IconButton>
            </Flex>

            {expanded && <AdvancedBar />}
        </Flex>
    );
}
