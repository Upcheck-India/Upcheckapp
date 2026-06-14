import { Controller, Get } from '@nestjs/common';
import { DataDictionaryService } from './data-dictionary.service';

/**
 * Read access to the versioned data dictionary so the client can render
 * dictionary-driven entry forms (units, ranges, allowed values) without
 * hardcoding parameter metadata.
 */
@Controller('data-dictionary')
export class DataDictionaryController {
  constructor(private readonly service: DataDictionaryService) {}

  /** All active parameter definitions. */
  @Get()
  getActive() {
    return this.service.getActive();
  }
}
