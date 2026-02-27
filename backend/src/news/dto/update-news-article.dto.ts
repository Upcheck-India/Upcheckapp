import { PartialType } from '@nestjs/mapped-types';
import { CreateNewsArticleDto } from './create-news-article.dto';

export class UpdateNewsArticleDto extends PartialType(CreateNewsArticleDto) {}
