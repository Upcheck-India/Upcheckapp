import apiClient from './client';

export interface Profile {
    id: string;
    email?: string;
    username?: string;
    fullName?: string;
    avatarUrl?: string;
    website?: string;
    languagePreference: string;
    updatedAt: string;
    // ── Account facts, GET /profiles/me only ──
    /** When the account was created (users.created_at). */
    createdAt?: string | null;
    /** Truecaller-verified phone, digits only. */
    phone?: string | null;
    phoneVerified?: boolean;
    /** False for Google-only and Truecaller accounts until one is set. */
    hasPassword?: boolean;
    /** Supabase providers, e.g. ['email', 'google']. */
    providers?: string[];
    /** The email is the internal Truecaller login address, not a real one. */
    emailIsInternal?: boolean;
    // ── Profile picture, GET /profiles/me only (see MyAvatar) ──
    avatarThumbUrl?: string | null;
    hasUploadedAvatar?: boolean;
    showAvatarToTeam?: boolean;
}

/** The caller's own picture: uploaded (signed, 1h) beats the Google/Truecaller one. */
export interface MyAvatar {
    avatarUrl: string | null;
    avatarThumbUrl: string | null;
    /** True when it is an uploaded picture (so it can be removed). */
    hasUploadedAvatar: boolean;
    /** Farm-mates see it only while this is on. Never public. */
    showAvatarToTeam: boolean;
}

/**
 * Compat layer for screens still using firstName/lastName/phone.
 * The backend stores `fullName` as a single field — split on space.
 */
export interface ProfileCompat extends Profile {
    firstName?: string;
    lastName?: string;
}

export interface UpdateProfileDto {
    email?: string;
    username?: string;
    fullName?: string;
    avatarUrl?: string;
    website?: string;
    languagePreference?: string;
}

/** Compat DTO that accepts firstName/lastName and maps to fullName */ 
export interface CompatUpdateProfileDto {
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    website?: string;
    languagePreference?: string;
    phone?: string;
}

export interface PublicProfile {
    id: string;
    username?: string;
    fullName?: string;
    avatarUrl?: string;
    website?: string;
}

function toCompat(p: Profile): ProfileCompat {
    const parts = (p.fullName || '').split(' ');
    return {
        ...p,
        firstName: parts[0] || undefined,
        lastName: parts.slice(1).join(' ') || undefined,
    };
}

function compatToUpdateDto(data: CompatUpdateProfileDto): UpdateProfileDto {
    const { firstName, lastName, phone: _phone, ...rest } = data;
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined;
    return { ...rest, fullName };
}

export const profilesApi = {
    getMine: () =>
        apiClient.get<Profile>('/profiles/me').then(res => ({ ...res, data: toCompat(res.data) })),

    getById: (id: string) =>
        apiClient.get<Profile>(`/profiles/${id}`).then(res => ({ ...res, data: toCompat(res.data) })),

    /** The caller's display name — written to profile, users row and auth metadata. */
    updateMyName: (fullName: string) =>
        apiClient.patch<Profile>('/profiles/me', { fullName }).then(res => ({ ...res, data: toCompat(res.data) })),

    update: (id: string, data: CompatUpdateProfileDto) =>
        apiClient.patch<Profile>(`/profiles/${id}`, compatToUpdateDto(data)).then(res => ({ ...res, data: toCompat(res.data) })),

    // Password is required server-side for email/password accounts (strict
    // re-auth before this irreversible action); omitted for OAuth/phone
    // accounts, which have no password to verify.
    deleteMe: (password?: string) =>
        apiClient.delete('/profiles/me', password ? { data: { password } } : undefined),

    checkUsername: (username: string) =>
        apiClient.get<{ available: boolean }>(`/profiles/check-username/${username}`),

    getPublicProfile: (username: string) =>
        apiClient.get<PublicProfile>(`/profiles/public/${username}`),

    inviteFriend: (toEmail: string) =>
        apiClient.post<{ success: boolean }>('/profiles/invite', { toEmail }),

    /**
     * The caller's own onboarding preferences, stored on the `users` row in the
     * app's Postgres (Supabase-hosted) — not on the device, and not in Supabase
     * Auth `user_metadata`, which is client-mutable.
     */
    getMyPreferences: () =>
        apiClient.get<UserPreferences>('/profiles/me/preferences'),

    setMyPreferences: (patch: UserPreferences) =>
        apiClient.patch<UserPreferences>('/profiles/me/preferences', patch),

    /** Upload a cropped, compressed JPEG as the caller's picture. Online only. */
    uploadAvatar: (uri: string) => {
        const form = new FormData();
        form.append('file', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
        return apiClient.post<MyAvatar>('/profiles/me/avatar', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
        });
    },

    /** Deletes the uploaded picture from the server and storage. */
    removeAvatar: () => apiClient.delete<MyAvatar>('/profiles/me/avatar'),

    setAvatarVisibility: (showAvatarToTeam: boolean) =>
        apiClient.patch<MyAvatar>('/profiles/me/avatar-visibility', { showAvatarToTeam }),
};

/** Server-persisted, per-user preferences. Routes first-run; grants nothing. */
export interface UserPreferences {
    /**
     * `null` on a WRITE means clear it. Not `undefined` — JSON.stringify drops
     * undefined properties, so that never reaches the server at all.
     */
    onboardingIntent?: 'own_farm' | 'work_on_farm' | null;
}
