import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull, FindOptionsWhere } from 'typeorm';
import { WaterQualityRecord } from './water-quality-record.entity';
import { CreateWaterQualityRecordDto } from './dto/create-water-quality-record.dto';
import { UpdateWaterQualityRecordDto } from './dto/update-water-quality-record.dto';
import { PondsService } from '../ponds/ponds.service';
import { AlertsService } from '../alerts/alerts.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageMetaDto, PageDto } from '../common/dto/page.dto';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { latestNonNull } from '../pond-context/pond-context.service';
import { thresholdFor } from '../common/wq-thresholds';
import { HealthPhotoStorageService } from '../health-observations/health-photo-storage.service';

/**
 * Critical limits for persisted water-quality alerts, from the shared
 * per-species table (common/wq-thresholds) — the same one the Day Score and
 * the app's colours use. Was a private copy with pH min 6.5 (vannamei's table
 * says 7.0), so a 6.8 reading showed red on screen but raised no alert.
 */
export function criticalThresholds(species: string | null | undefined) {
  const ph = thresholdFor(species, 'ph');
  return {
    ph: { min: ph.criticalLow as number, max: ph.criticalHigh as number },
    dissolvedOxygen: { min: thresholdFor(species, 'do').criticalLow as number },
    ammonia: { max: thresholdFor(species, 'ammonia').criticalHigh as number },
  };
}

/**
 * The weekly-chemistry parameters (test kit / lab), as opposed to the daily
 * probe readings. A record "carries chemistry" when at least one is present.
 */
const CHEMISTRY_FIELDS = [
  'ammonia',
  'nitrite',
  'nitrate',
  'alkalinity',
  'hardness',
  'transparency',
] as const;

/** Every measured column `/latest` resolves independently. */
const LATEST_FIELDS = [
  'ph',
  'temperature',
  'dissolvedOxygen',
  'salinity',
  ...CHEMISTRY_FIELDS,
] as const;

/** Same window the engines use (pond-context.latestWaterQualityFor). */
const LATEST_WINDOW = 60;

@Injectable()
export class WaterQualityService {
  private readonly logger = new Logger(WaterQualityService.name);

  constructor(
    @InjectRepository(WaterQualityRecord)
    private recordsRepository: Repository<WaterQualityRecord>,
    private pondsService: PondsService,
    private alertsService: AlertsService,
    private readonly farmAccess: FarmAccessService,
    private readonly healthPhotoStorage: HealthPhotoStorageService,
  ) {}

  async create(createDto: CreateWaterQualityRecordDto, userId: string) {
    // Idempotent replay: if this client-minted id already landed, return it
    // (an offline queue drain can re-send the same record safely). Must
    // verify the caller can access the found record's farm BEFORE returning
    // it — a replayed op with a guessed id must not leak another farm's record.
    if (createDto.id) {
      const existing = await this.recordsRepository.findOne({
        where: { id: createDto.id },
      });
      if (existing) {
        await this.farmAccess.assertCanAccessPond(
          userId,
          existing.pondId,
          'WRITE_OPERATIONAL',
        );
        return existing;
      }
    }

    // Verify the user can write to this pond's farm (owner or worker).
    const pond = await this.pondsService.findOneAccessible(
      createDto.pondId,
      userId,
      'WRITE_OPERATIONAL',
    );

    const { photoPath, ...fields } = createDto;
    const record = this.recordsRepository.create({
      ...fields,
      recordedAt: createDto.recordedAt
        ? new Date(createDto.recordedAt)
        : undefined,
      createdById: userId,
      updatedById: userId,
    });
    const savedRecord = await this.recordsRepository.save(record);

    // F5 water colour (cap 1). Evidence only — no colour-analysis claim.
    if (photoPath !== undefined) {
      await this.healthPhotoStorage.applyRecordPhotos(
        this.recordsRepository.manager,
        'water_quality_records',
        'water_quality',
        pond.farmId,
        savedRecord.id,
        photoPath ? [photoPath] : [],
      );
    }

    // Alerts run AFTER the response, not inside it. They were awaited inline:
    // a species lookup, a supersede UPDATE, an alert INSERT and — the slow
    // part — an Expo push round trip per tripped threshold, all before the
    // farmer's phone heard "saved". Multiplied across a ten-pond morning
    // round that was most of the spinner. The reading is already committed
    // above, so nothing here can lose it; and the replay path returns before
    // reaching this line, so a re-sent record never raises its alerts twice.
    void this.queueAlerts(savedRecord, pond, userId);

    return savedRecord;
  }

  /** Per-pond tail of the background alert work — see queueAlerts. */
  private readonly alertChains = new Map<string, Promise<void>>();

  /**
   * Run checkAndGenerateAlerts off the response path, SERIALISED per pond.
   *
   * Order matters within a pond: reading B's supersede must not run before
   * reading A's create, or A's alert would outlive the newer reading (the
   * exact bug supersede exists to fix). Chaining per pond keeps the old
   * awaited ordering without making the client wait for it. Never rejects.
   *
   * ponytail: in-process chain only. Two API instances writing the same pond
   * within milliseconds could still interleave — as they could before, since
   * two requests were never ordered across instances. A queue if that matters.
   */
  queueAlerts(
    record: WaterQualityRecord,
    pond: { id: string; farmId: string; name?: string; activeCycleId?: string | null },
    userId: string,
  ): Promise<void> {
    const prev = this.alertChains.get(pond.id) ?? Promise.resolve();
    const next = prev
      .then(() => this.checkAndGenerateAlerts(record, pond, userId))
      .catch((error) =>
        this.logger.error(
          `Background water quality alerts failed (pond ${pond.id}, record ${record.id}): ${error}`,
          (error as Error)?.stack,
        ),
      )
      .finally(() => {
        if (this.alertChains.get(pond.id) === next) this.alertChains.delete(pond.id);
      });
    this.alertChains.set(pond.id, next);
    return next;
  }

  /**
   * Check water quality record against critical thresholds and generate alerts.
   * Non-blocking: errors in alert creation are logged but don't fail the record save.
   */
  private async checkAndGenerateAlerts(
    record: WaterQualityRecord,
    pond: { id: string; farmId: string; name?: string; activeCycleId?: string | null },
    userId: string,
  ) {
    const CRITICAL_THRESHOLDS = criticalThresholds(
      await this.speciesOf(pond.activeCycleId ?? null),
    );
    const alerts: Array<{
      title: string;
      message: string;
      severity: 'warning' | 'critical';
    }> = [];

    // pH checks
    if (record.ph !== null && record.ph !== undefined) {
      if (record.ph < CRITICAL_THRESHOLDS.ph.min) {
        alerts.push({
          title: 'Low pH Alert',
          message: `pH level ${record.ph} is below critical minimum of ${CRITICAL_THRESHOLDS.ph.min} in pond ${pond.name || pond.id}`,
          severity: 'critical',
        });
      } else if (record.ph > CRITICAL_THRESHOLDS.ph.max) {
        alerts.push({
          title: 'High pH Alert',
          message: `pH level ${record.ph} is above critical maximum of ${CRITICAL_THRESHOLDS.ph.max} in pond ${pond.name || pond.id}`,
          severity: 'critical',
        });
      }
    }

    // Dissolved oxygen check
    if (
      record.dissolvedOxygen !== null &&
      record.dissolvedOxygen !== undefined
    ) {
      if (record.dissolvedOxygen < CRITICAL_THRESHOLDS.dissolvedOxygen.min) {
        alerts.push({
          title: 'Low Dissolved Oxygen Alert',
          message: `Dissolved oxygen ${record.dissolvedOxygen} mg/L is below critical minimum of ${CRITICAL_THRESHOLDS.dissolvedOxygen.min} mg/L in pond ${pond.name || pond.id}`,
          severity: 'critical',
        });
      }
    }

    // Ammonia check
    if (record.ammonia !== null && record.ammonia !== undefined) {
      if (record.ammonia > CRITICAL_THRESHOLDS.ammonia.max) {
        alerts.push({
          title: 'High Ammonia Alert',
          message: `Ammonia level ${record.ammonia} mg/L exceeds critical maximum of ${CRITICAL_THRESHOLDS.ammonia.max} mg/L in pond ${pond.name || pond.id}`,
          severity: 'critical',
        });
      }
    }

    // A newer reading of the same pond SUPERSEDES the older one's alerts.
    //
    // Without this, logging a low DO raised a critical alert that nothing ever
    // cleared: the farmer aerated, logged a healthy reading, and every screen
    // reading the persisted stream still showed the pond red. The live
    // briefing recomputes from the latest reading and was already correct, so
    // the two disagreed about the same pond on the same screen.
    //
    // Superseding on EVERY new reading — not only on a good one — is the whole
    // rule: the alerts below are raised from this record, so after this line
    // the pond's water-quality alerts describe exactly the latest measurement.
    // Best-effort: failing to clear history must not fail the reading itself.
    try {
      await this.alertsService.supersedeOpenAlerts(
        userId,
        pond.id,
        'water_quality',
      );
    } catch (error) {
      this.logger.error(
        `Failed to supersede water quality alerts (pond ${pond.id}): ${error}`,
        (error as Error)?.stack,
      );
    }

    // Create alerts (non-blocking — errors are caught and logged)
    for (const alert of alerts) {
      try {
        await this.alertsService.createAutoAlert(
          userId,
          pond.farmId,
          'water_quality',
          alert.title,
          alert.message,
          alert.severity,
          {
            recordId: record.id,
            ph: record.ph,
            dissolvedOxygen: record.dissolvedOxygen,
            ammonia: record.ammonia,
          },
          pond.id,
          // C5.2: alert.message embeds the pond name; the push must not.
          'A water quality alert needs your attention. Open the app for details.',
        );
      } catch (error) {
        this.logger.error(
          `Failed to create water quality alert (pond ${pond.id}, record ${record.id}): ${error}`,
          (error as Error)?.stack,
        );
      }
    }
  }

  /**
   * The active crop's species, for per-species limits. Best-effort: a failed
   * lookup falls back to vannamei limits rather than dropping the alert.
   */
  private async speciesOf(cropId: string | null): Promise<string | null> {
    if (!cropId) return null;
    try {
      const [row] = await this.recordsRepository.query(
        `SELECT coalesce(s.scientific_name, c.species_type) AS species
           FROM crops c LEFT JOIN species s ON s.id = c.species_id
          WHERE c.id = $1`,
        [cropId],
      );
      return row?.species ?? null;
    } catch {
      return null;
    }
  }

  async findAll(
    pondId: string,
    userId: string,
    pageOptionsDto?: PageOptionsDto,
    chemistryOnly = false,
  ): Promise<PageDto<WaterQualityRecord>> {
    if (!pondId) {
      return new PageDto(
        [],
        new PageMetaDto({
          itemCount: 0,
          pageOptionsDto: pageOptionsDto || { page: 1, take: 10 },
        }),
      );
    }

    const skip = pageOptionsDto?.skip || 0;
    const take = pageOptionsDto?.take || 10;
    const order = pageOptionsDto?.order || 'DESC';

    // An array of wheres is OR'd: "at least one chemistry column is set".
    // Daily probe-only rows drop out, which is the whole point of the weekly
    // chemistry history — it must not be padded with rows that have no
    // chemistry in them.
    const where: FindOptionsWhere<WaterQualityRecord>[] | FindOptionsWhere<WaterQualityRecord> =
      chemistryOnly
        ? CHEMISTRY_FIELDS.map((f) => ({ pondId, [f]: Not(IsNull()) }))
        : { pondId };

    const [items, itemCount] = await this.recordsRepository.findAndCount({
      where,
      order: { recordedAt: order },
      take,
      skip,
    });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: pageOptionsDto || { page: 1, take },
    });
    return new PageDto(items, pageMetaDto);
  }

  async findByPond(
    pondId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Verify user can access the pond (owner or worker)
    await this.pondsService.verifyAccess(pondId, userId, 'READ');

    if (startDate && endDate) {
      return this.recordsRepository.find({
        where: {
          pondId,
          recordedAt: Between(startDate, endDate),
        },
        order: { recordedAt: 'DESC' },
      });
    }
    return this.recordsRepository.find({
      where: { pondId },
      order: { recordedAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string) {
    const record = await this.recordsRepository.findOneBy({ id });
    if (!record) {
      throw new NotFoundException(`WaterQualityRecord with ID ${id} not found`);
    }
    // Verify access via pond (owner or worker)
    await this.pondsService.verifyAccess(record.pondId, userId, 'READ');
    return record;
  }

  async update(
    id: string,
    updateDto: UpdateWaterQualityRecordDto,
    userId: string,
  ) {
    const existing = await this.findOne(id, userId); // Verify access
    // photoPath is not an entity column (F5) — handled separately below, or
    // `.update()` would throw on an unmapped property.
    const { photoPath, ...columns } = updateDto;
    await this.recordsRepository.update(id, {
      ...columns,
      updatedById: userId,
    });
    if (photoPath !== undefined) {
      const pond = await this.pondsService.findOneAccessible(existing.pondId, userId, 'WRITE_OPERATIONAL');
      await this.healthPhotoStorage.applyRecordPhotos(
        this.recordsRepository.manager,
        'water_quality_records',
        'water_quality',
        pond.farmId,
        id,
        photoPath ? [photoPath] : [],
      );
    }
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Verify ownership
    return this.recordsRepository.delete(id);
  }

  /**
   * Latest value of EACH column with its own `<field>AsOf` timestamp, so the
   * log screen can decide freshness per field: a probe reading taken an hour
   * ago and an alkalinity from last Tuesday come back in the same object,
   * each honestly dated. `recordedAt` is the newest record's time.
   */
  async getLatestPerColumn(pondId: string, userId: string) {
    await this.pondsService.verifyAccess(pondId, userId, 'READ');

    const records = await this.recordsRepository.find({
      where: { pondId },
      order: { recordedAt: 'DESC' },
      take: LATEST_WINDOW,
    });

    const out: Record<string, string | number | null> = {
      pondId,
      recordedAt: records.length
        ? new Date(records[0].recordedAt).toISOString()
        : null,
    };
    for (const field of LATEST_FIELDS) {
      const { value, at } = latestNonNull(records, field);
      out[field] = value;
      out[`${field}AsOf`] = at;
    }
    return out;
  }

  async getLatestByPond(pondId: string, userId: string) {
    // Verify user can access the pond (owner or worker)
    await this.pondsService.verifyAccess(pondId, userId, 'READ');

    return this.recordsRepository.findOne({
      where: { pondId },
      order: { recordedAt: 'DESC' },
    });
  }
}
