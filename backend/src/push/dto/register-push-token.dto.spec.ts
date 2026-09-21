import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterPushTokenDto } from './register-push-token.dto';

// The endpoint used to accept any non-empty string, which is how a
// stringified JS error (from a failed client-side getExpoPushTokenAsync())
// ended up persisted as a user's push_token in production.
describe('RegisterPushTokenDto', () => {
  const errorsFor = async (token: unknown) =>
    validate(plainToInstance(RegisterPushTokenDto, { token }));

  it('rejects an Expo error string', async () => {
    const errors = await errorsFor(
      'Error: Make sure to complete the guide at https://docs.expo.dev/push-notifications/fcm-credentials/',
    );
    expect(errors).not.toHaveLength(0);
  });

  it('rejects an empty token', async () => {
    expect(await errorsFor('')).not.toHaveLength(0);
  });

  it('accepts a real ExponentPushToken', async () => {
    expect(await errorsFor('ExponentPushToken[abcDEF123]')).toHaveLength(0);
  });

  it('accepts a real ExpoPushToken', async () => {
    expect(await errorsFor('ExpoPushToken[abcDEF123]')).toHaveLength(0);
  });
});
