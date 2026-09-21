import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackReport } from './feedback.entity';
import { FeedbackNote } from './feedback-note.entity';
import { FeedbackStorageService } from './feedback-storage.service';
import { PushService } from '../push/push.service';
import { EmailService } from '../email.service';

const MINE = 'farmer-1';
const THEIRS = 'farmer-2';

/** Chainable stand-in for TypeORM's SelectQueryBuilder, used by findAll. */
function makeQueryBuilder(rows: any[] = []) {
  const qb: any = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
  return qb;
}

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    query: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let notesRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let storage: { signAttachments: jest.Mock };
  let push: { sendToUser: jest.Mock };
  let email: { sendFeedbackAlertEmail: jest.Mock };

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
      // assigneesFor()/update()'s raw SQL — empty by default, i.e. the
      // `assignee` column behaves as "not migrated yet / nobody assigned".
      query: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => makeQueryBuilder([])),
    };
    notesRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'note-1', createdAt: new Date(), ...x })),
    };
    storage = { signAttachments: jest.fn().mockResolvedValue({ full: [], thumb: [] }) };
    push = { sendToUser: jest.fn().mockResolvedValue(true) };
    email = { sendFeedbackAlertEmail: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: getRepositoryToken(FeedbackReport), useValue: repo },
        { provide: getRepositoryToken(FeedbackNote), useValue: notesRepo },
        { provide: FeedbackStorageService, useValue: storage },
        { provide: PushService, useValue: push },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = module.get(FeedbackService);
  });

  describe('create', () => {
    it('stores the report against the caller, as new', async () => {
      await service.create(MINE, { category: 'problem', message: '  pH is wrong  ' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MINE,
          category: 'problem',
          message: 'pH is wrong',
          status: 'new',
          farmId: null,
          subject: null,
        }),
      );
    });

    it('accepts attachment paths inside the caller\'s own folder', async () => {
      await service.create(MINE, {
        category: 'problem',
        message: 'see photo',
        attachmentPaths: [`${MINE}/abc.jpg`],
      });

      expect(repo.save).toHaveBeenCalled();
    });

    /**
     * The path comes back from the client, so quoting someone else's is the
     * obvious way to try to read their photo through your own detail screen.
     */
    it('refuses an attachment path belonging to another farmer', async () => {
      await expect(
        service.create(MINE, {
          category: 'problem',
          message: 'sneaky',
          attachmentPaths: [`${THEIRS}/abc.jpg`],
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('refuses a traversal path', async () => {
      await expect(
        service.create(MINE, {
          category: 'problem',
          message: 'sneaky',
          attachmentPaths: [`${MINE}/../${THEIRS}/abc.jpg`],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  /**
   * A report saved to a table nobody watches is a report nobody answers. The
   * email is the alert; the constraints on it are privacy and never costing
   * the farmer their submission.
   */
  describe('team alert email', () => {
    it('emails the team with what triage needs', async () => {
      await service.create(MINE, {
        category: 'problem',
        message: 'Water test did not save',
        subject: 'Saving is broken',
        farmId: 'farm-9',
        attachmentPaths: [`${MINE}/a.jpg`, `${MINE}/b.jpg`],
      });

      expect(email.sendFeedbackAlertEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MINE,
          farmId: 'farm-9',
          category: 'problem',
          subject: 'Saving is broken',
          message: 'Water test did not save',
          attachmentCount: 2,
        }),
      );
      // The id is what gets pasted into the dashboard, so it has to be there.
      expect(email.sendFeedbackAlertEmail.mock.calls[0][0]).toHaveProperty('id');
    });

    /**
     * The Privacy Policy governs the reporter's contact details and none of
     * them help decide what to do about a bug. The user id is the handle.
     */
    it('never puts the reporter\'s phone or email in the payload', async () => {
      // A user object carrying contact details, as the entity would if the
      // relation were ever eager-loaded onto the saved row.
      repo.save.mockImplementation((x: any) =>
        Promise.resolve({
          ...x,
          id: 'r1',
          user: { phone: '+919876543210', email: 'farmer@example.com' },
        }),
      );

      await service.create(MINE, { category: 'problem', message: 'broken' });

      const payload = JSON.stringify(
        email.sendFeedbackAlertEmail.mock.calls[0][0],
      );
      expect(payload).not.toContain('9876543210');
      expect(payload).not.toContain('farmer@example.com');
      expect(payload).not.toMatch(/phone/i);
    });

    // Same rule as update()'s push: the farmer is shown a success, so the row
    // has to stand whether or not Brevo is up.
    it('still saves the report when the mailer is down', async () => {
      email.sendFeedbackAlertEmail.mockRejectedValue(new Error('brevo down'));

      await expect(
        service.create(MINE, { category: 'problem', message: 'broken' }),
      ).resolves.toEqual(
        expect.objectContaining({ message: 'broken', status: 'new' }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('does not email when the attachment check rejects the report', async () => {
      await expect(
        service.create(MINE, {
          category: 'problem',
          message: 'sneaky',
          attachmentPaths: [`${THEIRS}/a.jpg`],
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(email.sendFeedbackAlertEmail).not.toHaveBeenCalled();
    });
  });

  describe('ownership scoping', () => {
    it('lists only the caller\'s own reports', async () => {
      await service.findMine(MINE);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: MINE } }),
      );
    });

    /**
     * The scoping is in the WHERE clause, not a check after the fetch — so a
     * farmer naming another farmer's report id gets a 404 and learns nothing
     * about whether that id exists.
     */
    it('cannot read another farmer\'s report', async () => {
      repo.findOne.mockResolvedValue(null); // scoped query finds nothing

      await expect(service.findOneMine(MINE, 'report-of-farmer-2')).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'report-of-farmer-2', userId: MINE },
      });
    });

    it('reads its own report, with signed attachment urls', async () => {
      repo.findOne.mockResolvedValue({
        id: 'r1',
        userId: MINE,
        attachmentPaths: [`${MINE}/a.jpg`],
      });
      storage.signAttachments.mockResolvedValue({ full: ['https://signed/a.jpg'], thumb: ['https://signed/a.thumb.webp'] });

      const result = await service.findOneMine(MINE, 'r1');

      expect(result.attachmentUrls).toEqual(['https://signed/a.jpg']);
      expect(result.attachmentThumbUrls).toEqual(['https://signed/a.thumb.webp']);
    });
  });

  describe('a missing table is not an empty inbox', () => {
    // migrationsRun is false, so deploy-before-migrate is possible.
    const undefinedTable = Object.assign(new Error('relation does not exist'), {
      code: '42P01',
    });

    it('degrades findMine to empty instead of 500ing', async () => {
      repo.find.mockRejectedValue(undefinedTable);
      await expect(service.findMine(MINE)).resolves.toEqual([]);
    });

    it('degrades the admin list to empty instead of 500ing', async () => {
      repo.createQueryBuilder.mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(undefinedTable),
      });
      await expect(service.findAll({})).resolves.toEqual([]);
    });

    it('still rethrows a real database error', async () => {
      repo.find.mockRejectedValue(new Error('connection reset'));
      await expect(service.findMine(MINE)).rejects.toThrow('connection reset');
    });
  });

  describe('update (admin)', () => {
    const existing = () => ({
      id: 'r1',
      userId: MINE,
      status: 'new',
      adminResponse: null,
      respondedAt: null,
      respondedBy: null,
      attachmentPaths: [],
    });

    it('sets the status', async () => {
      repo.findOne.mockResolvedValue(existing());
      const result = await service.update('r1', { status: 'seen' });
      expect(result.status).toBe('seen');
    });

    it('moves a new report to in_review when the team replies', async () => {
      repo.findOne.mockResolvedValue(existing());

      const result = await service.update('r1', {
        adminResponse: 'Fixed in the next update.',
        respondedBy: 'Ravi',
      });

      // "Not seen yet" printed above a message from the team is nonsense.
      expect(result.status).toBe('in_review');
      expect(result.adminResponse).toBe('Fixed in the next update.');
      expect(result.respondedBy).toBe('Ravi');
      expect(result.respondedAt).toBeInstanceOf(Date);
    });

    it('leaves an explicitly chosen status alone', async () => {
      repo.findOne.mockResolvedValue(existing());

      const result = await service.update('r1', {
        status: 'done',
        adminResponse: 'Sorted.',
      });

      expect(result.status).toBe('done');
    });

    it('re-stamps the time when the response is edited', async () => {
      const old = new Date('2020-01-01T00:00:00.000Z');
      repo.findOne.mockResolvedValue({
        ...existing(),
        status: 'in_review',
        adminResponse: 'first try',
        respondedAt: old,
      });

      const result = await service.update('r1', { adminResponse: 'better answer' });

      // The farmer is shown the current text, so the timestamp has to describe it.
      expect(result.respondedAt!.getTime()).toBeGreaterThan(old.getTime());
    });

    it('clearing the response clears the byline and the timestamp', async () => {
      repo.findOne.mockResolvedValue({
        ...existing(),
        status: 'done',
        adminResponse: 'oops, wrong report',
        respondedAt: new Date(),
        respondedBy: 'Ravi',
      });

      const result = await service.update('r1', { adminResponse: '   ' });

      expect(result.adminResponse).toBeNull();
      expect(result.respondedAt).toBeNull();
      expect(result.respondedBy).toBeNull();
    });

    it('404s on an unknown report', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update('nope', { status: 'done' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /**
   * feedback_reports.admin_response has always been stored and PATCHable, but
   * nothing told the farmer. They had to reopen the report and check.
   */
  describe('admin response notification', () => {
    const existing = () => ({
      id: 'r1',
      userId: MINE,
      status: 'new',
      adminResponse: null,
      respondedAt: null,
      respondedBy: null,
      attachmentPaths: [],
    });

    it('pushes to the reporter when a response is written', async () => {
      repo.findOne.mockResolvedValue(existing());

      await service.update('r1', { adminResponse: 'We have fixed this.' });

      expect(push.sendToUser).toHaveBeenCalledWith(
        MINE,
        expect.objectContaining({
          data: { type: 'feedback_reply', reportId: 'r1' },
        }),
      );
    });

    it('does not push when only the status changed', async () => {
      repo.findOne.mockResolvedValue(existing());

      await service.update('r1', { status: 'seen' });

      expect(push.sendToUser).not.toHaveBeenCalled();
    });

    it('does not push when the response is cleared rather than written', async () => {
      repo.findOne.mockResolvedValue({
        ...existing(),
        status: 'done',
        adminResponse: 'oops, wrong report',
      });

      await service.update('r1', { adminResponse: '   ' });

      expect(push.sendToUser).not.toHaveBeenCalled();
    });

    // sendToUser's contract is "never throws into the caller"; the admin's
    // write must succeed even if delivery does not.
    it('still saves the response when the push fails', async () => {
      push.sendToUser.mockRejectedValue(new Error('expo down'));
      repo.findOne.mockResolvedValue(existing());

      await expect(
        service.update('r1', { adminResponse: 'Fixed.' }),
      ).resolves.toBeTruthy();
    });
  });

  describe('assignee (raw-SQL column, not entity-mapped)', () => {
    const existing = () => ({
      id: 'r1',
      userId: MINE,
      status: 'new',
      adminResponse: null,
      respondedAt: null,
      respondedBy: null,
      attachmentPaths: [],
    });

    it('sets the assignee via raw SQL and returns it', async () => {
      repo.findOne.mockResolvedValue(existing());

      const result = await service.update('r1', { assignee: 'Priya' });

      expect(repo.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE feedback_reports SET assignee'),
        ['Priya', 'r1'],
      );
      expect(result.assignee).toBe('Priya');
    });

    it('clears the assignee on an empty string', async () => {
      repo.findOne.mockResolvedValue(existing());
      const result = await service.update('r1', { assignee: '  ' });
      expect(result.assignee).toBeNull();
    });

    it('degrades to null instead of 500ing when the column is not migrated', async () => {
      repo.findOne.mockResolvedValue(existing());
      repo.query.mockRejectedValueOnce(
        Object.assign(new Error('column "assignee" does not exist'), { code: '42703' }),
      );

      const result = await service.update('r1', { assignee: 'Priya' });

      expect(result.status).toBe('new'); // the rest of the update still saved
      expect(result.assignee).toBeNull();
    });

    it('lists reports with their assignee joined in', async () => {
      repo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder([{ id: 'r1', attachmentPaths: [] }]),
      );
      repo.query.mockResolvedValue([{ id: 'r1', assignee: 'Priya' }]);

      const [row] = await service.findAll({});
      expect(row.assignee).toBe('Priya');
    });
  });

  describe('notes (append-only)', () => {
    it('adds a note against an existing report', async () => {
      repo.findOne.mockResolvedValue({ id: 'r1' });

      const note = await service.addNote('r1', { note: 'Called the farmer.', author: 'Ravi' });

      expect(notesRepo.save).toHaveBeenCalled();
      expect(note.note).toBe('Called the farmer.');
      expect(note.author).toBe('Ravi');
      expect(note.reportId).toBe('r1');
    });

    it('404s adding a note to an unknown report', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.addNote('nope', { note: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('degrades listNotes to empty when feedback_notes is missing', async () => {
      const undefinedTable = Object.assign(new Error('relation does not exist'), {
        code: '42P01',
      });
      notesRepo.find.mockRejectedValue(undefinedTable);
      await expect(service.listNotes('r1')).resolves.toEqual([]);
    });
  });
});
