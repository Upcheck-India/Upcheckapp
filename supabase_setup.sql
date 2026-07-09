-- =============================================================
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. TRIGGER FUNCTION: copy auth.users → public.users
--    Fires on every INSERT or UPDATE to auth.users
--    (covers email/pass signup, Google OAuth, email verification)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _username  TEXT;
    _firstName TEXT;
    _lastName  TEXT;
    _fullName  TEXT;
    _provider  TEXT;
    _googleId  TEXT;
    _avatarUrl TEXT;
BEGIN
    -- Derive fields from Supabase auth metadata
    _provider  := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    _fullName  := COALESCE(
                    NEW.raw_user_meta_data->>'full_name',
                    NEW.raw_user_meta_data->>'name',
                    ''
                 );
    _firstName := COALESCE(
                    NEW.raw_user_meta_data->>'firstName',
                    SPLIT_PART(_fullName, ' ', 1),
                    ''
                 );
    _lastName  := COALESCE(
                    NEW.raw_user_meta_data->>'lastName',
                    CASE
                        WHEN POSITION(' ' IN _fullName) > 0
                        THEN SUBSTRING(_fullName FROM POSITION(' ' IN _fullName) + 1)
                        ELSE ''
                    END,
                    ''
                 );
    _username  := COALESCE(
                    NULLIF(NEW.raw_user_meta_data->>'username', ''),
                    SPLIT_PART(NEW.email, '@', 1)
                 );
    -- Google OAuth: sub field holds the Google user ID
    _googleId  := CASE WHEN _provider = 'google'
                       THEN NEW.raw_user_meta_data->>'sub'
                       ELSE NULL
                  END;
    _avatarUrl := COALESCE(
                    NEW.raw_user_meta_data->>'avatar_url',
                    NEW.raw_user_meta_data->>'picture'
                 );

    -- Handle username uniqueness: append numeric suffix if collision
    DECLARE
        _base TEXT := _username;
        _suffix INT := 1;
    BEGIN
        WHILE EXISTS (
            SELECT 1 FROM public.users
            WHERE username = _username
              AND id != NEW.id
        ) LOOP
            _username := _base || _suffix::TEXT;
            _suffix   := _suffix + 1;
        END LOOP;
    END;

    INSERT INTO public.users (
        id, email, username, first_name, last_name,
        auth_provider, email_verified, google_id,
        avatar_url, is_active, created_at, updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        _username,
        _firstName,
        _lastName,
        _provider,
        CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END,
        _googleId,
        _avatarUrl,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email          = EXCLUDED.email,
        email_verified = EXCLUDED.email_verified,
        avatar_url     = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        first_name     = CASE WHEN EXCLUDED.first_name != '' THEN EXCLUDED.first_name ELSE public.users.first_name END,
        last_name      = CASE WHEN EXCLUDED.last_name  != '' THEN EXCLUDED.last_name  ELSE public.users.last_name  END,
        updated_at     = NOW();

    RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 2. ATTACH TRIGGERS on auth.users
-- ──────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- 2b. TRIGGER FUNCTION: mirror auth.users DELETE → public.users
--     Covers deletes done outside the app (dashboard / admin GDPR
--     delete), so a direct auth.users delete doesn't orphan the
--     public.users row (and its farms/ponds/crops/logs) or block a
--     later re-signup on the same email via the UNIQUE(email) constraint.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.users WHERE id = OLD.id;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

-- ──────────────────────────────────────────────────────────────
-- 3. BACKFILL: copy any existing auth.users into public.users
--    (users who signed up before the trigger existed)
-- ──────────────────────────────────────────────────────────────
INSERT INTO public.users (
    id, email, username, first_name, last_name,
    auth_provider, email_verified, google_id,
    avatar_url, is_active, created_at, updated_at
)
SELECT
    u.id,
    u.email,
    COALESCE(
        NULLIF(u.raw_user_meta_data->>'username', ''),
        SPLIT_PART(u.email, '@', 1)
    )                                                           AS username,
    COALESCE(
        u.raw_user_meta_data->>'firstName',
        SPLIT_PART(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 1)
    )                                                           AS first_name,
    COALESCE(
        u.raw_user_meta_data->>'lastName',
        CASE
            WHEN POSITION(' ' IN COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')) > 0
            THEN SUBSTRING(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '') FROM
                 POSITION(' ' IN COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')) + 1)
            ELSE ''
        END
    )                                                           AS last_name,
    COALESCE(u.raw_app_meta_data->>'provider', 'email')        AS auth_provider,
    (u.email_confirmed_at IS NOT NULL)                         AS email_verified,
    CASE WHEN u.raw_app_meta_data->>'provider' = 'google'
         THEN u.raw_user_meta_data->>'sub'
         ELSE NULL
    END                                                         AS google_id,
    COALESCE(
        u.raw_user_meta_data->>'avatar_url',
        u.raw_user_meta_data->>'picture'
    )                                                           AS avatar_url,
    true                                                        AS is_active,
    u.created_at,
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.users p WHERE p.id = u.id
);

-- ──────────────────────────────────────────────────────────────
-- 4. DISABLE EMAIL CONFIRMATION (optional but recommended for
--    dev/testing — removes the "Email not confirmed" error)
--    Comment this out if you want email verification enforced.
-- ──────────────────────────────────────────────────────────────
-- NOTE: This must be done in the Supabase Dashboard instead:
--   Authentication → Configuration → Email → "Confirm email" → Toggle OFF
--   (Cannot be changed via SQL)

-- ──────────────────────────────────────────────────────────────
-- 5. VERIFY: check the trigger exists and users are synced
-- ──────────────────────────────────────────────────────────────
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'on_auth_user_updated', 'on_auth_user_deleted');

SELECT COUNT(*) AS public_users_count FROM public.users;
SELECT COUNT(*) AS auth_users_count   FROM auth.users;
