"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const news_article_entity_1 = require("./news-article.entity");
let NewsService = class NewsService {
    articlesRepository;
    constructor(articlesRepository) {
        this.articlesRepository = articlesRepository;
    }
    create(createDto) {
        const article = this.articlesRepository.create(createDto);
        return this.articlesRepository.save(article);
    }
    findAll(category) {
        const where = { isActive: true };
        if (category)
            where.category = category;
        return this.articlesRepository.find({
            where,
            order: { publishedAt: 'DESC' },
        });
    }
    findOne(id) {
        return this.articlesRepository.findOneBy({ id });
    }
    async update(id, updateDto) {
        await this.articlesRepository.update(id, updateDto);
        return this.findOne(id);
    }
    remove(id) {
        return this.articlesRepository.delete(id);
    }
};
exports.NewsService = NewsService;
exports.NewsService = NewsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(news_article_entity_1.NewsArticle)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], NewsService);
//# sourceMappingURL=news.service.js.map