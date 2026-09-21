import { AdminWhoamiController } from './admin-whoami.controller';

describe('AdminWhoamiController', () => {
  it('returns the staff name AdminKeyGuard attached to the request', () => {
    const controller = new AdminWhoamiController();
    expect(controller.whoami({ adminStaff: 'robin' } as any)).toEqual({ staff: 'robin' });
  });

  /**
   * The controller itself trusts req.adminStaff unconditionally — AdminKeyGuard
   * is what actually refuses an unknown/missing key (it throws before this
   * handler ever runs). This just documents that division of labour: a
   * request that somehow reaches here without a resolved identity returns an
   * unhelpful `{ staff: undefined }` rather than 401ing a second time, which
   * is fine because the guard is what real callers go through.
   */
  it('reflects whatever adminStaff the guard resolved, shared-key included', () => {
    const controller = new AdminWhoamiController();
    expect(controller.whoami({ adminStaff: 'shared-key' } as any)).toEqual({
      staff: 'shared-key',
    });
  });
});
