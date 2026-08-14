import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { asAppError } from '@/errors/AppError';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';

import { useAuth } from './useAuth';

export function LoginPage() {
    const navigate = useNavigate();
    const { login, loginMutation } = useAuth();
    const [customToken, setCustomToken] = useState('');

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        await login({ customToken });
        void navigate('/home');
    };

    return (
        <section className="mx-auto flex max-w-md flex-col gap-4 p-5">
            <div>
                <h1 className="text-xl font-semibold">Connect account</h1>
                <p className="mt-1 text-sm text-text-muted">
                    This is a temporary auth scaffold. The production flow will supply a custom
                    sign-in token from the backend rather than asking for one here.
                </p>
            </div>

            <Card variant="raised" padding="lg">
                <form className="flex flex-col gap-3" onSubmit={submit}>
                    <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-text-muted">Custom sign-in token</span>
                        <input
                            value={customToken}
                            onChange={(event) => setCustomToken(event.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                            className="h-10 rounded-control border border-border bg-app px-3 text-sm text-text outline-none focus:border-text-muted"
                            placeholder="Token from backend"
                        />
                    </label>

                    {loginMutation.error && (
                        <p className="text-sm text-danger">
                            {asAppError(loginMutation.error).message}
                        </p>
                    )}

                    <Button
                        type="submit"
                        loading={loginMutation.isPending}
                        disabled={!customToken.trim()}
                    >
                        Sign in
                    </Button>
                </form>
            </Card>
        </section>
    );
}
