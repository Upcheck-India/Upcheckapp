import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackReport } from './feedback.entity';
import { FeedbackNote } from './feedback-note.entity';
import { FeedbackStorageService } from './feedback-storage.service';
import { PushService } from '../push/push.service';
import { EmailService } from '../email.service';
import {
  AddFeedbackNoteDto,
  CreateFeedbackDto,
  ListFeedbackDto,
  UpdateFeedbackDto,
} from './dto/feedback.dto';
import type { FeedbackCategory, FeedbackStatus } from './feedback-status';

/**
 * Postgres "undefined_table" (42P01) — same pattern as attendance.service.ts
 * and disease.service.ts. `feedback_reports` is a brand-new table and
 * `migrationsRun` is false, so a deploy-before-migrate window is real. Reads
 * degrade to empty rather than 500ing; writes fail honestly, because there is
 * nowhere safe to put a report the farmer would then believe was sent.
 */
function isMissingTable(err: any): boolean {
  return (err?.code ?? err?.driverError?.code) === '42P01';
}

/**
 * Postgres "undefined_column" (42703) — `assignee` (migration 1780702600000)
 * is read/written with raw SQL, not a mapped entity column (see
 * feedback.entity.ts), so this is the column-level twin of isMissingTable:
 * degrade instead of 500ing every existing feedback read over one new field.
 */
function isMissingColumn(err: any): boolean {
  return (err?.code ?? err?.driverError?.code) === '42703';
}

/** What the app and the dashboard see — the entity plus signed image URLs. */
export interface FeedbackView extends FeedbackReport {
  attachmentUrls: string[];
  /** 400px thumbnails, same order as attachmentUrls. */
  attachmentThumbUrls: string[];
  /** null until migration 1780702600000 runs, or when nobody is assigned. */
  assignee: string | null;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(FeedbackReport)
    private readonly repo: Repository<FeedbackReport>,
    @InjectRepository(FeedbackNote)
    private readonly notesRepo: Repository<FeedbackNote>,
    private readonly storage: FeedbackStorageService,
    private readonly push: PushService,
    private readonly email: EmailService,
  ) {}

  // ──────────────────────────────── farmer ────────────────────────────────

  async create(userId: string, dto: CreateFeedbackDto): Promise<FeedbackView> {
    const paths = dto.attachmentPaths ?? [];
    this.assertOwnsPaths(userId, paths);

    const report = this.repo.create({
      userId,
      farmId: dto.farmId ?? null,
      category: dto.category as FeedbackCategory,
      subject: dto.subject?.trim() || null,
      message: dto.message.trim(),
      attachmentPaths: paths,
      status: 'new',
    });
    const saved = await this.repo.save(report);
    await this.storage.attach(paths, saved.id);

    // Alert the team, or the report sits in a table nobody is watching.
    // Best-effort by the same rule as update()'s push: the farmer was shown a
    // success, so the save must stand whether or not Brevo is up. Logged, not
    // swallowed silently — an outage that costs us every report should be
    // visible somewhere.
    await this.email
      .sendFeedbackAlertEmail({
        id: saved.id,
        userId: saved.userId,
        farmId: saved.farmId,
        category: saved.category,
        subject: saved.subject,
        message: saved.message,
        attachmentCount: paths.length,
      })
      .catch((err) =>
        this.logger.error(
          `Feedback alert email failed for report ${saved.id}: ${err?.message}`,
        ),
      );

    return this.withUrls(saved);
  }

  /** Every report this user has sent, newest first. */
  async findMine(userId: string): Promise<FeedbackView[]> {
    try {
      const rows = await this.repo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      // The list does not sign attachments: it renders a paperclip count, not
      // thumbnails, so signing N reports × 3 images on every pull-to-refresh
      // would be wasted signing for pixels nobody looks at. assignee is an
      // admin-only concept — the farmer's own list never needs it, so it is
      // left null here rather than spending a query on it.
      return rows.map((r) => ({
        ...r,
        attachmentUrls: [],
        attachmentThumbUrls: [],
        assignee: null,
      }));
    } catch (err) {
      if (isMissingTable(err)) {
        this.logger.warn('feedback_reports is missing — returning no reports.');
        return [];
      }
      throw err;
    }
  }

  /**
   * One report of the caller's own.
   *
   * Scoped by userId in the WHERE clause, not fetched-then-checked: a report
   * belonging to someone else is a 404, not a 403, so this endpoint cannot be
   * used to probe which ids exist.
   */
  async findOneMine(userId: string, id: string): Promise<FeedbackView> {
    const report = await this.repo
      .findOne({ where: { id, userId } })
      .catch((err) => {
        if (isMissingTable(err)) return null;
        throw err;
      });
    if (!report) throw new NotFoundException('Report not found');
    return this.withUrls(report);
  }

  // ───────────────────────────────── admin ────────────────────────────────

  async findAll(query: ListFeedbackDto): Promise<FeedbackView[]> {
    try {
      const qb = this.repo
        .createQueryBuilder('f')
        .orderBy('f.createdAt', 'DESC')
        .take(query.limit ?? 50)
        .skip(query.offset ?? 0);
      if (query.status) qb.andWhere('f.status = :status', { status: query.status });
      if (query.category) qb.andWhere('f.category = :category', { category: query.category });
      if (query.q) {
        qb.andWhere('(f.subject ILIKE :q OR f.message ILIKE :q)', {
          q: `%${query.q}%`,
        });
      }

      const rows = await qb.getMany();
      const assignees = await this.assigneesFor(rows.map((r) => r.id));
      return rows.map((r) => ({
        ...r,
        attachmentUrls: [],
        attachmentThumbUrls: [],
        assignee: assignees.get(r.id) ?? null,
      }));
    } catch (err) {
      if (isMissingTable(err)) {
        this.logger.warn('feedback_reports is missing — returning no reports.');
        return [];
      }
      throw err;
    }
  }

  async findOneAsAdmin(id: string): Promise<FeedbackView> {
    const report = await this.repo.findOne({ where: { id } }).catch((err) => {
      if (isMissingTable(err)) return null;
      throw err;
    });
    if (!report) throw new NotFoundException('Report not found');
    const assignees = await this.assigneesFor([id]);
    return { ...(await this.withUrls(report)), assignee: assignees.get(id) ?? null };
  }

  /**
   * Set status and/or write or edit the response.
   *
   * One rule is enforced here rather than left to the dashboard: a report that
   * carries a reply cannot still be `new`. Staff replying straight from the
   * inbox without touching the status dropdown is the normal case, and the
   * farmer seeing "Not seen yet" above a message from the team is the kind of
   * small nonsense that makes people stop trusting the feature.
   */
  async update(id: string, dto: UpdateFeedbackDto): Promise<FeedbackView> {
    const report = await this.repo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    if (dto.status) report.status = dto.status as FeedbackStatus;

    // Only a non-empty response counts as "written" for notification purposes
    // — a status-only PATCH, or one that clears the response, must not push.
    let wroteResponse = false;
    if (dto.adminResponse !== undefined) {
      const text = dto.adminResponse.trim();
      report.adminResponse = text || null;
      // Editing an existing reply re-stamps the time — the farmer is being
      // shown the current text, so the timestamp must describe that text.
      report.respondedAt = text ? new Date() : null;
      report.respondedBy = text ? (dto.respondedBy?.trim() ?? null) : null;
      if (text && report.status === 'new') report.status = 'in_review';
      wroteResponse = !!text;
    }

    const saved = await this.repo.save(report);

    // assignee lives outside the mapped entity (see feedback.entity.ts) —
    // written with raw SQL, guarded the same way as every other pre-migration
    // read/write in this file.
    let assignee: string | null = null;
    if (dto.assignee !== undefined) {
      const value = dto.assignee.trim() || null;
      try {
        await this.repo.query(
          `UPDATE feedback_reports SET assignee = $1 WHERE id = $2`,
          [value, id],
        );
        assignee = value;
      } catch (err) {
        if (!isMissingColumn(err)) throw err;
        this.logger.warn(
          `feedback_reports.assignee is missing — assignee not saved for ${id}.`,
        );
      }
    } else {
      assignee = (await this.assigneesFor([id])).get(id) ?? null;
    }

    // Tell the farmer, rather than making them reopen the report to find out.
    // Best-effort by design: sendToUser never throws into its caller, and an
    // admin's reply must save whether or not delivery succeeds.
    if (wroteResponse) {
      await this.push
        .sendToUser(saved.userId, {
          title: 'Support replied to your report',
          body: 'Tap to read the reply.',
          data: { type: 'feedback_reply', reportId: saved.id },
        })
        .catch(() => undefined);
    }

    return { ...(await this.withUrls(saved)), assignee };
  }

  // ──────────────────────────────── notes ──────────────────────────────────

  /** Every staff note on a report, oldest first (append-only, never edited). */
  async listNotes(reportId: string): Promise<FeedbackNote[]> {
    try {
      return await this.notesRepo.find({
        where: { reportId },
        order: { createdAt: 'ASC' },
      });
    } catch (err) {
      if (isMissingTable(err)) return [];
      throw err;
    }
  }

  async addNote(reportId: string, dto: AddFeedbackNoteDto): Promise<FeedbackNote> {
    const report = await this.repo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    const note = this.notesRepo.create({
      reportId,
      author: dto.author?.trim() || null,
      note: dto.note.trim(),
    });
    return this.notesRepo.save(note);
  }

  // ──────────────────────────────── helpers ───────────────────────────────

  /**
   * report id → assignee, for the ids given. Empty/omitted map entries mean
   * "no assignee or the column isn't migrated yet" — callers already treat
   * `?? null` as the same thing either way.
   */
  private async assigneesFor(ids: string[]): Promise<Map<string, string | null>> {
    const map = new Map<string, string | null>();
    if (ids.length === 0) return map;
    try {
      const rows: { id: string; assignee: string | null }[] = await this.repo.query(
        `SELECT id, assignee FROM feedback_reports WHERE id = ANY($1::uuid[])`,
        [ids],
      );
      for (const r of rows) map.set(r.id, r.assignee);
    } catch (err) {
      if (!isMissingColumn(err)) throw err;
    }
    return map;
  }

  /**
   * Attachment paths come back from the client on create, so re-check they are
   * inside this user's own folder. Without this a farmer could quote another
   * farmer's storage path in their own report and read the photo back through
   * the signed URL on their own detail screen.
   */
  private assertOwnsPaths(userId: string, paths: string[]): void {
    const prefix = `${userId}/`;
    if (paths.some((p) => !p.startsWith(prefix) || p.includes('..'))) {
      throw new ForbiddenException('Attachment does not belong to you');
    }
  }

  private async withUrls(report: FeedbackReport): Promise<FeedbackView> {
    const { full, thumb } = await this.storage.signAttachments(
      report.attachmentPaths ?? [],
    );
    return {
      ...report,
      attachmentUrls: full,
      attachmentThumbUrls: thumb,
      // Overwritten by callers that actually looked assignee up; farmer-facing
      // callers (findOneMine) leave it null, same as findMine's list.
      assignee: null,
    };
  }
}
