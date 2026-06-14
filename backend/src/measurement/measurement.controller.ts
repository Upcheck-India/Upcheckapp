import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MeasurementService } from './measurement.service';
import {
  CreateMeasurementDto,
  CreateMeasurementBatchDto,
} from './dto/create-measurement.dto';
import { QueryMeasurementDto } from './dto/query-measurement.dto';
import { EditMeasurementDto } from './dto/edit-measurement.dto';

/**
 * Unified Measurement ingest/read surface (PRD §6.2 keystone). Ownership is
 * enforced in {@link MeasurementService} against the referenced pond, so every
 * route is scoped to the authenticated owner.
 */
@Controller('measurements')
export class MeasurementController {
  constructor(private readonly service: MeasurementService) {}

  /** Ingest one reading. Idempotent on a client-supplied `id`. */
  @Post()
  create(@Body() dto: CreateMeasurementDto, @CurrentUser() user) {
    return this.service.create(dto, user.id);
  }

  /** Batch ingest for offline sync; per-item idempotent + fault-isolated. */
  @Post('batch')
  createBatch(@Body() dto: CreateMeasurementBatchDto, @CurrentUser() user) {
    return this.service.createBatch(
      dto.measurements,
      user.id,
      dto.continueOnError ?? true,
    );
  }

  /** Time-series read (pondId required; optional crop/param/category/window). */
  @Get()
  query(@Query() q: QueryMeasurementDto, @CurrentUser() user) {
    return this.service.query(q, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.service.findOne(id, user.id);
  }

  /** Append a corrected reading (original is preserved + superseded). */
  @Patch(':id')
  edit(
    @Param('id') id: string,
    @Body() dto: EditMeasurementDto,
    @CurrentUser() user,
  ) {
    return this.service.edit(id, dto, user.id);
  }
}
