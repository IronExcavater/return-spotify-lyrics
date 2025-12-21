import { useEffect, useMemo, useRef, useState } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import type { Query } from 'lrclib-api';
import type { LrcRpcReturn } from '../../background/lrcRpc.ts';
import { sendLyricsMessage } from '../../shared/messaging';
import { asTrack } from '../../shared/types';
import { usePlayer } from '../hooks/usePlayer';

type LyricsPayload = LrcRpcReturn<'getLyrics'>;

export function LyricsView() {
    const { playback, progressMs } = usePlayer();
    const track = asTrack(playback?.item);
    const [lyrics, setLyrics] = useState<LyricsPayload>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastActiveIndex = useRef(-1);

    const query = useMemo<Query | null>(() => {
        if (!track) return null;
        const artist = track.artists?.[0]?.name;
        if (!artist) return null;
        return {
            track_name: track.name,
            artist_name: artist,
            album_name: track.album?.name,
            duration: track.duration_ms,
        };
    }, [
        track?.id,
        track?.name,
        track?.duration_ms,
        track?.album?.name,
        track?.artists?.[0]?.name,
    ]);

    useEffect(() => {
        let active = true;

        if (!query) {
            setLyrics(null);
            setLoading(false);
            setError(null);
            return () => {
                active = false;
            };
        }

        setLoading(true);
        setError(null);
        setLyrics(null);

        sendLyricsMessage('getLyrics', query)
            .then((response) => {
                if (!active) return;
                setLyrics(response ?? null);
                setLoading(false);
            })
            .catch((err) => {
                if (!active) return;
                setError(err?.message ?? 'Failed to load lyrics.');
                setLyrics(null);
                setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [query]);

    const lines = lyrics?.lyrics ?? [];
    const hasTiming = useMemo(
        () => lines.some((line) => line.startTime != null),
        [lines]
    );

    const activeIndex = useMemo(() => {
        if (!hasTiming || !lines.length) return -1;
        let index = 0;
        for (let i = 0; i < lines.length; i += 1) {
            const start = lines[i].startTime ?? 0;
            if (start <= progressMs) index = i;
            else break;
        }
        return index;
    }, [hasTiming, lines, progressMs]);

    useEffect(() => {
        lastActiveIndex.current = -1;
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0 });
        }
    }, [track?.id]);

    useEffect(() => {
        if (!hasTiming || activeIndex < 0) return;
        if (lastActiveIndex.current === activeIndex) return;
        lastActiveIndex.current = activeIndex;

        const target = scrollRef.current?.querySelector(
            `[data-line="${activeIndex}"]`
        );
        if (target instanceof HTMLElement) {
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, [activeIndex, hasTiming]);

    let message: string | null = null;
    if (!track) message = 'Play a track to see lyrics.';
    else if (loading) message = 'Loading lyrics...';
    else if (error) message = 'Could not load lyrics.';
    else if (lyrics?.instrumental) message = 'Instrumental.';
    else if (lines.length === 0) message = 'No lyrics available.';

    return (
        <Flex
            direction="column"
            flexGrow="1"
            className="min-h-[280px] text-white select-none"
            p="4"
            style={{ background: 'var(--gray-12)' }}
        >
            <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">
                <Flex
                    direction="column"
                    gap="1"
                    className="text-lg leading-relaxed"
                >
                    {message && (
                        <Text size="3" className="text-white/70">
                            {message}
                        </Text>
                    )}
                    {!message &&
                        lines.map((line, index) => (
                            <Text
                                key={`${line.text}-${index}`}
                                size="4"
                                weight={
                                    index === activeIndex ? 'bold' : 'medium'
                                }
                                className={
                                    index === activeIndex
                                        ? 'text-white'
                                        : 'text-white/70'
                                }
                                data-line={index}
                            >
                                {line.text}
                            </Text>
                        ))}
                </Flex>
            </div>
        </Flex>
    );
}
