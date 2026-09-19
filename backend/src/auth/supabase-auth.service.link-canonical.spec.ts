/**
 * linkTruecallerToUser must use the SAME phone canonicalization as
 * signInWithTruecaller.
 *
 * Sign-in stores `users.phone` digits-only ("917010133018"). The missed-call
 * endpoint returns "+917010133018". If linking compared and stored the raw
 * value, a phone already owned by a Truecaller account would slip past the
 * uniqueness check and be written a second time in a different spelling —
 * two accounts claiming one phone, and the next Truecaller sign-in resolving
 * to whichever row the lookup happens to hit.
 */
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAuthService, canonicalPhone } from './supabase-auth.service';

const createClientMock = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

type Row = { id: string; phone: string | null; phone_verified?: boolean };

function fakeUsersTable(rows: Row[]) {
  const table = new Map(rows.map((r) => [r.id, { ...r }]));
  return {
    table,
    from: () => {
      const filters: [string, unknown][] = [];
      let patch: Record<string, unknown> | null = null;
      const b: any = {
        select: () => b,
        update: (p: Record<string, unknown>) => {
          patch = p;
          return b;
        },
        eq: (col: string, val: unknown) => {
          filters.push([col, val]);
          if (patch) {
            for (const r of table.values()) {
              if (filters.every(([c, v]) => (r as any)[c] === v)) {
                Object.assign(r, patch);
              }
            }
            return Promise.resolve({ data: null, error: null });
          }
          return b;
        },
        maybeSingle: () => {
          const hit = [...table.values()].find((r) =>
            filters.every(([c, v]) => (r as any)[c] === v),
          );
          return Promise.resolve({ data: hit ?? null, error: null });
        },
      };
      return b;
    },
  };
}

function build(rows: Row[]) {
  const fake = fakeUsersTable(rows);
  createClientMock.mockReturnValue(fake);
  const svc = new SupabaseAuthService(
    new ConfigService({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
    }),
  );
  return { svc, table: fake.table };
}

describe('linkTruecallerToUser — phone canonicalization', () => {
  it('canonicalPhone keeps digits only (the sign-in stored form)', () => {
    expect(canonicalPhone('+91 70101-33018')).toBe('917010133018');
    expect(canonicalPhone(917010133018 as unknown as string)).toBe(
      '917010133018',
    );
  });

  it('REFUSES a +91 phone already owned (canonically) by another account', async () => {
    const { svc, table } = build([
      { id: 'truecaller-account', phone: '917010133018' },
      { id: 'me', phone: null },
    ]);

    await expect(
      svc.linkTruecallerToUser('me', { phoneNumber: '+917010133018' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(table.get('me')!.phone).toBeNull();
  });

  it('stores the canonical form, so a later Truecaller sign-in finds this row', async () => {
    const { svc, table } = build([{ id: 'me', phone: null }]);

    const res = await svc.linkTruecallerToUser('me', {
      phoneNumber: '+917010133018',
    });

    expect(table.get('me')!.phone).toBe('917010133018');
    expect(table.get('me')!.phone_verified).toBe(true);
    expect(res.phoneNumber).toBe('917010133018');
  });

  it('is idempotent when the caller already owns the canonical phone', async () => {
    const { svc } = build([{ id: 'me', phone: '917010133018' }]);
    await expect(
      svc.linkTruecallerToUser('me', { phoneNumber: '+917010133018' }),
    ).resolves.toEqual({ linked: true, phoneNumber: '917010133018' });
  });
});

describe('a provider avatar never replaces an uploaded profile picture', () => {
  it('linking Truecaller writes avatar_url only; the uploaded avatar_path survives', async () => {
    const uploaded = 'me/0b8c5f5e-6f1f-4c61-9d5e-0a8f0f7f2a11.webp';
    const { svc, table } = build([
      { id: 'me', phone: null, avatar_path: uploaded } as Row & { avatar_path: string },
    ]);
    await svc.linkTruecallerToUser('me', {
      phoneNumber: '+917010133018',
      avatarUrl: 'https://truecaller.example/pic.jpg',
    });
    const row: any = table.get('me');
    expect(row.avatar_url).toBe('https://truecaller.example/pic.jpg');
    expect(row.avatar_path).toBe(uploaded);
  });
});
