import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { HealthObservation } from './health-observation.entity';
import { CreateHealthObservationsDto } from './dto/create-health-observations.dto';
import { HealthPhotoStorageService } from './health-photo-storage.service';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { currentMoltWindow, addDays } from '../molt/molt-window';
import { toIstDateString } from '../common/ist-date';
import { isMissingSchema } from './health.constants';

/** Noon IST of a `YYYY-MM-DD` day — safely inside that IST day. */
const noonIst = (day: string) => new Date(`${day}T06:30:00.000Z`);

@Injectable()
export class HealthObservationsService {
  private readonly logger = new Logger(HealthObservationsService.name);

  constructor(
    @InjectRepository(HealthObservation)
    private readonly repo: Repository<HealthObservation>,
    private readonly farmAccess: FarmAccessService,
    private readonly photos: HealthPhotoStorageService,
  ) {}

  /**
   * One health check → one row per sign. Idempotent on each row's
   * client-minted id: a replay inserts nothing and returns the stored rows.
   */
  async create(dto: CreateHealthObservationsDto, userId: string) {
    const pond = await this.farmAccess.assertCanAccessPond(
      userId,
      dto.pondId,
      'WRITE_OPERATIONAL',
    );
    this.photos.assertFarmPaths(pond.farmId, dto.photoUrls);

    const ids = dto.signs.map((s) => s.id);
    const existing = await this.repo.find({ where: { id: In(ids) } });
    // A client id colliding with another pond's row must not leak it.
    if (existing.some((r) => r.pondId !== dto.pondId)) {
      throw new ForbiddenException('Observation id already exists for a different pond');
    }

    let cropId = pond.activeCycleId ?? null;
    if (dto.cropId) {
      const [crop] = await this.repo.manager.query(
        `SELECT pond_id FROM crops WHERE id = $1`,
        [dto.cropId],
      );
      if (!crop || crop.pond_id !== dto.pondId) {
        throw new BadRequestException('cropId is not a cycle of this pond');
      }
      cropId = dto.cropId;
    }

    const day = dto.observedOn.slice(0, 10);
    const windowKey = currentMoltWindow(noonIst(day)).window?.key ?? null;
    const have = new Set(existing.map((r) => r.id));
    const fresh = dto.signs
      .filter((s) => !have.has(s.id))
      .map((s) => ({
        id: s.id,
        pondId: dto.pondId,
        cropId,
        observedOn: day,
        sign: s.sign,
        level: s.level,
        count: s.count ?? null,
        sampleSize: dto.sampleSize ?? null,
        moltDeaths: dto.moltDeaths ?? null,
        source: dto.source,
        windowKey,
        photoUrls: dto.photoUrls ?? [],
        createdBy: userId,
      }));
    if (fresh.length) {
      await this.repo
        .createQueryBuilder()
        .insert()
        .values(fresh)
        .orIgnore()
        .execute();
    }
    return this.repo.find({ where: { id: In(ids) } });
  }

  /**
   * A pond's observations of the last `days` IST days (0 = today only),
   * newest first. [] before the migration has run.
   */
  async listForPond(pondId: string, userId: string, days = 3, now = new Date()) {
    const pond = await this.farmAccess.assertCanAccessPond(userId, pondId, 'READ');
    const from = addDays(toIstDateString(now), -Math.max(0, days));
    try {
      const rows = await this.repo.find({
        where: { pondId, observedOn: MoreThanOrEqual(from) },
        order: { observedOn: 'DESC', createdAt: 'DESC' },
        take: 200,
      });
      return this.photos.withSigned(pond.farmId, rows);
    } catch (err) {
      if (isMissingSchema(err)) {
        this.logger.warn('health_observations not migrated yet; returning []');
        return [];
      }
      throw err;
    }
  }

  async uploadPhoto(pondId: string, userId: string, file: any) {
    const pond = await this.farmAccess.assertCanAccessPond(
      userId,
      pondId,
      'WRITE_OPERATIONAL',
    );
    return { path: await this.photos.upload(pond.farmId, file) };
  }
}
