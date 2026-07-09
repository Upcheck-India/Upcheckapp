import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataDictionaryEntry } from './data-dictionary.entity';
import {
  DATA_DICTIONARY_SEED,
  DATA_DICTIONARY_VERSION,
} from './data-dictionary.seed';

/**
 * Outcome of validating one reading against its dictionary entry. Returns the
 * canonical unit so the pipeline can stamp it on the stored measurement.
 */
export interface ValidationResult {
  entry: DataDictionaryEntry;
  canonicalUnit: string;
}

@Injectable()
export class DataDictionaryService implements OnModuleInit {
  private readonly logger = new Logger(DataDictionaryService.name);

  constructor(
    @InjectRepository(DataDictionaryEntry)
    private readonly repo: Repository<DataDictionaryEntry>,
  ) {}

  /**
   * Idempotent bootstrap: seed v1 if the dictionary is empty. Guarantees dev
   * and the SQLite test harness have a dictionary without a manual migration;
   * a no-op once seeded (prod is seeded by the migration).
   */
  async onModuleInit(): Promise<void> {
    try {
      // Idempotent + incremental: insert any seed param missing from the
      // dictionary. This both seeds a fresh DB and back-fills newly-added
      // params on an already-seeded one, without a manual migration.
      const existing = await this.repo.find({ select: ['param'] });
      const have = new Set(existing.map((e) => e.param));
      const missing = DATA_DICTIONARY_SEED.filter((s) => !have.has(s.param));
      if (!missing.length) return;
      const rows = missing.map((s) =>
        this.repo.create({
          ...s,
          allowedValues: s.allowedValues ?? null,
          minValue: s.minValue ?? null,
          maxValue: s.maxValue ?? null,
          version: DATA_DICTIONARY_VERSION,
          isActive: true,
        }),
      );
      await this.repo.save(rows);
      this.logger.log(`Data dictionary: added ${rows.length} param(s)`);
    } catch (err) {
      // Never block app startup on a seeding hiccup (e.g. race on cold start).
      this.logger.warn(
        `Data dictionary bootstrap skipped: ${(err as Error).message}`,
      );
    }
  }

  /** All active dictionary entries, ordered by category then param. */
  async getActive(): Promise<DataDictionaryEntry[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { category: 'ASC', param: 'ASC' },
    });
  }

  /** The active entry for a param, or null. */
  async getEntry(param: string): Promise<DataDictionaryEntry | null> {
    return this.repo.findOne({ where: { param, isActive: true } });
  }

  /**
   * Validate a reading against the active dictionary entry for `param`.
   *
   * Enforces: param exists; unit matches the canonical unit; categorical
   * values are in the allowed set; numeric values are finite and in range.
   * When `isMissing` is set the value channels must be empty (null ≠ 0) and
   * range/type checks are skipped. Throws {@link BadRequestException} on any
   * violation so the global pipe maps it to HTTP 400.
   */
  async validate(input: {
    param: string;
    valueNum?: number | null;
    valueText?: string | null;
    unit?: string | null;
    isMissing?: boolean;
  }): Promise<ValidationResult> {
    const entry = await this.getEntry(input.param);
    if (!entry) {
      throw new BadRequestException(`Unknown param '${input.param}'`);
    }

    const hasNum = input.valueNum !== undefined && input.valueNum !== null;
    const hasText =
      input.valueText !== undefined &&
      input.valueText !== null &&
      input.valueText !== '';

    // null ≠ 0: a missing reading must carry no value.
    if (input.isMissing) {
      if (hasNum || hasText) {
        throw new BadRequestException(
          `'${input.param}' is marked missing but carries a value`,
        );
      }
      return { entry, canonicalUnit: entry.unit };
    }

    // Unit must match the canonical unit when the dictionary defines one and
    // the caller supplied a unit. (Callers may omit unit and inherit canonical.)
    if (entry.unit && input.unit && input.unit !== entry.unit) {
      throw new BadRequestException(
        `'${input.param}' expects unit '${entry.unit}', got '${input.unit}'`,
      );
    }

    if (entry.valueType === 'categorical') {
      if (!hasText) {
        throw new BadRequestException(`'${input.param}' requires a text value`);
      }
      const allowed = entry.allowedValues ?? [];
      if (allowed.length && !allowed.includes(input.valueText as string)) {
        throw new BadRequestException(
          `'${input.param}' value '${input.valueText}' is not allowed`,
        );
      }
      return { entry, canonicalUnit: entry.unit };
    }

    if (entry.valueType === 'boolean') {
      if (!hasNum || (input.valueNum !== 0 && input.valueNum !== 1)) {
        throw new BadRequestException(
          `'${input.param}' is boolean; value must be 0 or 1`,
        );
      }
      return { entry, canonicalUnit: entry.unit };
    }

    // numeric
    if (!hasNum || !Number.isFinite(input.valueNum)) {
      throw new BadRequestException(
        `'${input.param}' requires a numeric value`,
      );
    }
    const v = input.valueNum as number;
    if (entry.minValue !== null && v < Number(entry.minValue)) {
      throw new BadRequestException(
        `'${input.param}' value ${v} is below minimum ${entry.minValue}`,
      );
    }
    if (entry.maxValue !== null && v > Number(entry.maxValue)) {
      throw new BadRequestException(
        `'${input.param}' value ${v} is above maximum ${entry.maxValue}`,
      );
    }
    return { entry, canonicalUnit: entry.unit };
  }
}
