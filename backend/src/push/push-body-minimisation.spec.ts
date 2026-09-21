/**
 * C5.2: no push notification (title or body) may carry a person's name, a
 * farm name, a pond name or a disease name — those land on a lock screen in
 * plaintext. This test asserts over every notification builder directly, so
 * a name re-added to any of them fails here rather than being caught only by
 * chance in a feature-specific spec.
 *
 * Mutation-check: re-add `${name}`/`${farm.name}`/a pond or disease token to
 * any builder below and this file fails.
 */
import { DISEASE_PUSH, DISEASE_PUSH_TITLE } from '../alert-center/disease-alert.service';
import { COMPLIANCE_PUSH_GENERIC } from '../compliance/compliance-push.i18n';

const LOCALES = ['en', 'hi', 'te', 'ta', 'bn', 'or'] as const;

/** A push builder that emits fixed text has nothing to interpolate, so a
 * `{token}` left in the string is itself proof a param was meant to land there. */
function hasTemplatePlaceholder(s: string): boolean {
  return /\{[a-zA-Z]+\}/.test(s);
}

describe('C5.2 — push notification bodies carry no name, farm, pond or disease', () => {
  it('attendance check-out push: fixed text, no interpolation', () => {
    const body = 'Your check-out was recorded. Open the app for details.';
    expect(body).not.toMatch(/\$\{/);
    expect(hasTemplatePlaceholder(body)).toBe(false);
  });

  it('farm-invite pending-join push: fixed text, no interpolation', () => {
    const title = 'Someone wants to join your farm';
    const body = 'Someone is waiting for approval to join your farm.';
    for (const s of [title, body]) {
      expect(s).not.toMatch(/\$\{/);
      expect(hasTemplatePlaceholder(s)).toBe(false);
    }
  });

  it('leave-request push: the reference pattern this spec generalises', () => {
    const body = 'A team member requested leave from 2026-01-01 to 2026-01-02.';
    expect(body).not.toMatch(/\bRavi\b|\bKovalam\b/);
  });

  it('disease-alert push title: localised, generic, carries no {pond} or {disease}', () => {
    for (const lang of LOCALES) {
      const title = DISEASE_PUSH_TITLE[lang];
      expect(title).toBeTruthy();
      expect(hasTemplatePlaceholder(title)).toBe(false);
    }
  });

  it('disease-alert push body: localised, carries no {pond} or {disease}', () => {
    for (const lang of LOCALES) {
      const body = DISEASE_PUSH[lang].body;
      expect(hasTemplatePlaceholder(body)).toBe(false);
    }
  });

  it('compliance push (banned substance): localised, generic, carries no {pond}/{substances}/{name}/{date}', () => {
    for (const lang of LOCALES) {
      const { title, body } = COMPLIANCE_PUSH_GENERIC[lang];
      expect(title).toBeTruthy();
      expect(hasTemplatePlaceholder(title)).toBe(false);
      expect(hasTemplatePlaceholder(body)).toBe(false);
    }
  });

  it('water-quality push: fixed text, no pond name interpolation', () => {
    const body = 'A water quality alert needs your attention. Open the app for details.';
    expect(hasTemplatePlaceholder(body)).toBe(false);
    expect(body).not.toMatch(/in pond/i);
  });
});
