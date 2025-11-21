interface Props {
    onLogin: () => void;
}

export function LoginView({ onLogin }: Props) {
    return <button onClick={onLogin}>Login with Spotify</button>;
}
