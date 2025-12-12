import { Button, Flex, Text } from '@radix-ui/themes';
import { CheckIcon } from '@radix-ui/react-icons';

interface Props {
    onLogin: () => void;
}

export function LoginView({ onLogin }: Props) {
    const features = [
        'Unblocks lyrics for free accounts',
        'Modern mini player controls',
        'Quick tweaks without opening Spotify',
    ];

    return (
        <Flex
            flexGrow="1"
            justify="center"
            align="center"
            className="relative bg-slate-950 px-4 py-6 text-white"
        >
            <div className="relative flex w-full max-w-lg flex-col gap-6">
                <div className="flex flex-col gap-1 text-[0.65rem] tracking-[0.5em] text-white/60 uppercase">
                    <span className="text-white">Return Spotify Lyrics</span>
                    <span className="text-white/60">Mini player companion</span>
                </div>
                <Text size="2" className="text-white/80">
                    Keep lyrics and playback controls docked in the popup, so
                    the music keeps its voice even when Spotify free loses the
                    lyric button.
                </Text>

                <div className="flex flex-col gap-2 text-white/70">
                    {features.map((feature) => (
                        <div
                            key={feature}
                            className="group flex flex-row items-center gap-2 transition-colors duration-200 hover:text-white"
                        >
                            <span className="text-emerald-300 transition-colors group-hover:text-white">
                                <CheckIcon />
                            </span>
                            <Text
                                size="2"
                                className="transition-colors group-hover:text-white"
                            >
                                {feature}
                            </Text>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-2">
                    <Button
                        size="3"
                        variant="solid"
                        onClick={onLogin}
                        className="w-fit px-6 text-base shadow-[0_20px_35px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_25px_45px_rgba(0,0,0,0.45)] active:translate-y-0"
                    >
                        Continue with Spotify
                    </Button>
                    <Text size="1" className="text-center text-white/60">
                        Stays on this browser until you log out.
                    </Text>
                </div>
            </div>
        </Flex>
    );
}
