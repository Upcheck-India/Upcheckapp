import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Not, Repository } from 'typeorm';
import { Alert } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { PushService } from '../push/push.service';

/**
 * A live engine alert someone marked done. Stored as a read row in the same
 * table (no migration), tied to the pond, and hidden from every alert list. It
 * silences that pond's alert whose `dismissKey` (finding + reading) it names
 * for EVERYONE who sees the pond: a teammate must not keep acting on a problem
 * already handled.
 */
export const DISMISSED_TYPE = 'dismissed';
const DISMISS_DAYS = 30;

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private alertsRepository: Repository<Alert>,
    private pushService: PushService,
  ) {}

  create(createDto: CreateAlertDto) {
    const alert = this.alertsRepository.create(createDto);
    return this.alertsRepository.save(alert);
  }

  /**
   * Retire a pond's open alerts of one type, because a newer measurement has
   * replaced the one they were raised from.
   *
   * An alert about a reading is only true until the next reading. Nothing used
   * to retire them, so a low-oxygen alert survived the aeration that fixed it
   * and every screen built on the unread stream kept the pond red — while the
   * live briefing, recomputed from the latest data, said it was fine. Two
   * answers to the same question on the same screen.
   *
   * Marked read rather than deleted: what happened in the pond yesterday is
   * worth keeping, it just is not what is happening now.
   */
  async supersedeOpenAlerts(userId: string, pondId: string, type: string) {
    await this.alertsRepository.update(
      { userId, pondId, type, isRead: false },
      { isRead: true },
    );
  }

  async createAutoAlert(
    userId: string,
    farmId: string,
    type: string,
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'critical' = 'info',
    data?: Record<string, any>,
    pondId?: string,
    /**
     * C5.2: some callers' `message` embeds a pond name (e.g. water quality) —
     * the alert-center row keeps that detail, but the push notification must
     * not. When set, this replaces `message` in the push body only.
     */
    pushMessage?: string,
  ) {
    const alert = this.alertsRepository.create({
      userId,
      farmId,
      type,
      title,
      message,
      severity,
      data,
      pondId,
      isRead: false,
      isPushSent: false,
    });
    const saved = await this.alertsRepository.save(alert);

    // Best-effort Expo push to the owner; reflect the outcome on the row.
    const pushed = await this.pushService.sendToUser(userId, {
      title,
      body: pushMessage ?? message,
      data: { alertId: saved.id, type, ...(data ?? {}) },
    });
    if (pushed) {
      saved.isPushSent = true;
      await this.alertsRepository.update(saved.id, { isPushSent: true });
    }
    return saved;
  }

  /**
   * Is there already an open alert of this type for this thing?
   *
   * Auto-alerts had no dedupe, and the low-stock one is raised on EVERY stock
   * write that leaves an item below its reorder level. A farm logging feed
   * daily from a low bag therefore minted a fresh alert per log, per recipient
   * — the farmer's alert list filled with the same sentence and the banner
   * never appeared to go away, because a new one kept arriving behind it.
   *
   * Matching on the jsonb `data` key rather than the message text: the message
   * embeds the current quantity, so it differs every time and would never
   * match itself.
   */
  async hasOpenAutoAlert(
    userId: string,
    type: string,
    dataKey: string,
    dataValue: string,
  ): Promise<boolean> {
    const count = await this.alertsRepository
      .createQueryBuilder('a')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.type = :type', { type })
      .andWhere('a.is_read = false')
      .andWhere(`a.data ->> :dataKey = :dataValue`, { dataKey, dataValue })
      .getCount();
    return count > 0;
  }

  /**
   * Close every open alert of a type for one thing, for everyone who got it.
   *
   * The condition that raised the alert has gone away, so the alert has too —
   * nothing else ever cleared these. An item restocked above its reorder level
   * left its "running low" alerts sitting unread forever, which is exactly the
   * state a farmer reads as "the app is stuck".
   */
  async resolveAutoAlerts(
    type: string,
    dataKey: string,
    dataValue: string,
  ): Promise<number> {
    const result = await this.alertsRepository
      .createQueryBuilder()
      .update(Alert)
      .set({ isRead: true })
      .where('type = :type', { type })
      .andWhere('is_read = false')
      .andWhere(`data ->> :dataKey = :dataValue`, { dataKey, dataValue })
      .execute();
    return result.affected ?? 0;
  }

  /** Mark ponds' live alerts done until their reading changes. Caller checks access. */
  async dismiss(userId: string, items: { pondId: string; dismissKey: string }[]) {
    if (!items.length) return { dismissed: 0 };
    await this.alertsRepository.save(
      items.map(({ pondId, dismissKey: k }) =>
        this.alertsRepository.create({
          userId,
          pondId,
          type: DISMISSED_TYPE,
          title: 'Marked done',
          message: k,
          isRead: true,
        }),
      ),
    );
    return { dismissed: items.length };
  }

  /** Recent "done" marks on these ponds, by anyone, as dismissKeys. */
  async dismissedKeys(pondIds: string[]): Promise<Set<string>> {
    if (!pondIds.length) return new Set();
    const rows = await this.alertsRepository.find({
      select: { message: true },
      where: {
        pondId: In(pondIds),
        type: DISMISSED_TYPE,
        createdAt: MoreThan(new Date(Date.now() - DISMISS_DAYS * 86_400_000)),
      },
    });
    return new Set(rows.map((r) => r.message));
  }

  findByUser(userId: string, unreadOnly = false) {
    const where: any = { userId, type: Not(DISMISSED_TYPE) };
    if (unreadOnly) where.isRead = false;
    return this.alertsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Alert> {
    const alert = await this.alertsRepository.findOneBy({ id });
    if (!alert) throw new NotFoundException(`Alert with ID ${id} not found`);
    return alert;
  }

  async findOneForUser(id: string, userId: string): Promise<Alert> {
    const alert = await this.findOne(id);
    if (alert.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this alert',
      );
    }
    return alert;
  }

  async markAsRead(id: string) {
    await this.findOne(id);
    await this.alertsRepository.update(id, { isRead: true });
    return this.findOne(id);
  }

  async markAsReadForUser(id: string, userId: string) {
    await this.findOneForUser(id, userId);
    await this.alertsRepository.update(id, { isRead: true });
    return this.findOne(id);
  }

  async markAllAsRead(userId: string) {
    await this.alertsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.alertsRepository.delete(id);
    return { message: 'Alert deleted successfully' };
  }

  async removeForUser(
    id: string,
    userId: string,
  ): Promise<{ message: string }> {
    await this.findOneForUser(id, userId);
    await this.alertsRepository.delete(id);
    return { message: 'Alert deleted successfully' };
  }

  async getUnreadCount(userId: string) {
    return this.alertsRepository.count({ where: { userId, isRead: false } });
  }
}
