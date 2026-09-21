import { AdminDirectoryController } from './admin-directory.controller';
import { AdminDirectoryService } from './admin-directory.service';

/**
 * The search routes have no `:id` param, so they set `req.adminSubject`
 * themselves (see the controller's doc comment) — this is what
 * AdminAccessLogInterceptor reads to log WHO a staffer looked up, without
 * ever writing their raw search term (a farmer's email/phone) into
 * admin_access_log.
 */
describe('AdminDirectoryController subject logging', () => {
  function controllerWith(directory: Partial<AdminDirectoryService>) {
    return new AdminDirectoryController(directory as AdminDirectoryService);
  }

  it('sets adminSubject to the matched user id(s) on a hit', async () => {
    const directory = { searchUsers: jest.fn().mockResolvedValue([{ id: 'u1', email: 'a@b.com' }]) };
    const req: any = {};

    await controllerWith(directory).searchUsers({ email: 'a@b.com' }, req);

    expect(req.adminSubject).toEqual({ type: 'user', id: 'u1' });
  });

  it('joins multiple matched ids with a comma', async () => {
    const directory = {
      searchFarms: jest.fn().mockResolvedValue([{ id: 'f1' }, { id: 'f2' }]),
    };
    const req: any = {};

    await controllerWith(directory).searchFarms({ name: 'Nel' }, req);

    expect(req.adminSubject).toEqual({ type: 'farm', id: 'f1,f2' });
  });

  it('never puts the raw search term in adminSubject', async () => {
    const directory = { searchUsers: jest.fn().mockResolvedValue([]) };
    const req: any = {};

    await controllerWith(directory).searchUsers({ phone: '+91 98765 43210' }, req);

    expect(req.adminSubject).toEqual({ type: 'user', id: 'none' });
    expect(JSON.stringify(req.adminSubject)).not.toContain('98765');
  });
});
