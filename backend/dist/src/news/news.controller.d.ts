import { NewsService } from './news.service';
import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';
export declare class NewsController {
    private readonly newsService;
    constructor(newsService: NewsService);
    create(createDto: CreateNewsArticleDto): Promise<import("./news-article.entity").NewsArticle>;
    findAll(category?: string): Promise<import("./news-article.entity").NewsArticle[]>;
    findOne(id: string): Promise<import("./news-article.entity").NewsArticle | null>;
    update(id: string, updateDto: UpdateNewsArticleDto): Promise<import("./news-article.entity").NewsArticle | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
