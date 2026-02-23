import { PartialType } from '@nestjs/mapped-types';
import { CreateFeedProductDto } from './create-feed-product.dto';

export class UpdateFeedProductDto extends PartialType(CreateFeedProductDto) {}
