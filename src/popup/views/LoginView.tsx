import { Button, Flex, Text } from '@radix-ui/themes';
import { CheckIcon } from '@radix-ui/react-icons';

interface Props {
    onLogin: () => void;
}

export function LoginView({ onLogin }: Props) {
    const highlights = [
        'Live lyrics sync and playback controls in one panel',
        'Works even when Spotify free tier hides the lyric button',
        'Keeps your session remembered until you explicitly log out',
    ];

    return (
        <Flex flexGrow="1" justify="center" className="px-4 py-6">
            <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-gradient-to-b from-[#0b101a] via-[#0e1424] to-[#05070c] p-6 text-white shadow-[0_35px_60px_rgba(0,0,0,0.45)]">
                <div className="space-y-1">
                    <Text
                        size="1"
                        weight="bold"
                        className="text-[0.7rem] font-semibold tracking-[0.4em] text-white/60 uppercase"
                    >
                        Return Spotify Lyrics
                    </Text>
                    <Text size="6" weight="bold">
                        Connect to Spotify
                    </Text>
                    <Text size="2" className="text-white/70">
                        Sign in once to unlock pinned lyrics and remote controls
                        across every popup.
                    </Text>
                </div>

                <div className="space-y-2 text-sm text-white/80">
                    {highlights.map((item) => (
                        <div key={item} className="flex items-start gap-2">
                            <span className="mt-0.5 text-emerald-300">
                                <CheckIcon />
                            </span>
                            <span>{item}</span>
                        </div>
                    ))}
                </div>

                <Button
                    size="3"
                    variant="solid"
                    onClick={onLogin}
                    className="shadow-[0_10px_25px_rgba(0,0,0,0.35)]"
                >
                    Login with Spotify
                </Button>
            </div>
        </Flex>
    );
}
