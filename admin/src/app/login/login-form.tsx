'use client';

import { useActionState } from 'react';
import { signIn, type SignInState } from './actions';

const initialState: SignInState = {};

export function LoginForm() {
    const [state, formAction, pending] = useActionState(signIn, initialState);

    return (
        <form action={formAction} className="editor">
            <div>
                <label htmlFor="key">Your admin key</label>
                <input id="key" name="key" type="password" autoComplete="off" autoFocus required />
            </div>
            {state.error && <p className="error">{state.error}</p>}
            <button type="submit" disabled={pending}>
                {pending ? 'Signing in…' : 'Sign in'}
            </button>
        </form>
    );
}
