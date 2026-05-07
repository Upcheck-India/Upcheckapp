import { PartialType } from '@nestjs/mapped-types';
import { CreateBroodstockDto } from './create-broodstock.dto';

export class UpdateBroodstockDto extends PartialType(CreateBroodstockDto) {}
