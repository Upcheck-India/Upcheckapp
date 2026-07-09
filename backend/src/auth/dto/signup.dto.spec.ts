import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SignupDto } from './signup.dto';

/** PWDVAL-2: broaden the special-char set so e.g. "MyPass#123" is accepted. */
function passwordErrors(password: string) {
  const errs = validateSync(
    plainToInstance(SignupDto, { email: 'a@b.com', password }),
  );
  return errs.filter((e) => e.property === 'password');
}

describe('SignupDto — password policy (PWDVAL-2)', () => {
  it('accepts MyPass#123 (# was previously rejected)', () => {
    expect(passwordErrors('MyPass#123')).toHaveLength(0);
  });

  it('accepts other broadened specials (-, _, .)', () => {
    expect(passwordErrors('My-Pass_1.')).toHaveLength(0);
  });

  it('rejects a password with no special character', () => {
    expect(passwordErrors('MyPass1234').length).toBeGreaterThan(0);
  });

  it('rejects a password missing an uppercase/digit', () => {
    expect(passwordErrors('mypass#pass').length).toBeGreaterThan(0);
  });
});

/**
 * PWDVAL-1 cross-boundary parity — SAME fixture list as
 * frontend/src/features/__tests__/passwordPolicy.test.ts. Keep the two lists
 * identical (add/remove a case in both files together); this is how a future
 * regex edit on either side that silently diverges the two independent
 * implementations gets caught, since each side otherwise only tests its own
 * logic against its own examples.
 */
describe('SignupDto — password policy vs frontend fixtures (PWDVAL-1 parity)', () => {
  const fixtures: Array<[label: string, pw: string, expectValid: boolean]> = [
    ['plain valid', 'MyPass#123', true],
    ['exactly 8 chars, all rules met', 'short1A!', true],
    ['7 chars — one under the minimum', 'Sh0rt1!', false],
    ['no special character', 'NoSpecial1', false],
    ['no digit', 'NoDigits!!', false],
    ['no uppercase', 'alllower1!', false],
    ['no lowercase', 'ALLUPPER1!', false],
    ['hyphen as the special char', 'My-Pass1', true],
    ['underscore + period as specials', 'My_Pass1.', true],
    ['space as the special char', 'My Pass1', true],
    ['emoji as the special char (multi-byte)', 'MyPass1😀', true],
    ['accented letter counts as special, not a letter class', 'MyPass1é', true],
    ['very long password, all rules met', `Aa1!${'x'.repeat(200)}`, true],
    ['only symbols — missing letters and digit', '!!!!!!!!', false],
    ['leading/trailing whitespace, otherwise valid', ' MyPass1! ', true],
  ];

  it.each(fixtures)('%s: %s → valid=%s', (_label, pw, expectValid) => {
    expect(passwordErrors(pw).length === 0).toBe(expectValid);
  });
});
