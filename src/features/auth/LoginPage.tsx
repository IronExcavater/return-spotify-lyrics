import { Button } from '@/ui/Button';

export function LoginPage() {
    return (
        <section className="flex flex-col items-start gap-4 p-5">
            <div>
                <h1 className="text-xl font-semibold">Connect Spotify</h1>
                <p className="mt-1 text-sm text-text-muted">
                    Authentication will be added as the first backend vertical
                    slice.
                </p>
            </div>
            <Button disabled>Connect Spotify</Button>
        </section>
    );
}
