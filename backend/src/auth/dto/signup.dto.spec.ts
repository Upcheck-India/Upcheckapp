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
