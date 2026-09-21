import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
    return (
        <>
            <h1>Sign in</h1>
            <p className="sub">
                Paste the personal admin key you were given — not a shared password. See{' '}
                <code>backend/RENDER-SETUP.md</code> if you don&apos;t have one yet.
            </p>
            <LoginForm />
        </>
    );
}
