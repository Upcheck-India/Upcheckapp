import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsService } from './news.service';
import { NewsArticle } from './news-article.entity';

// Mock repository factory
const createMockRepository = () => ({
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'test-id' })),
  find: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
});

describe('NewsService', () => {
  let service: NewsService;
  let mockRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        {
          provide: getRepositoryToken(NewsArticle),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    mockRepository = module.get<Repository<NewsArticle>>(getRepositoryToken(NewsArticle));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new news article', async () => {
      const createDto = {
        title: 'New Aquaculture Technique',
        content: 'Detailed content about the technique',
        summary: 'Brief summary',
        category: 'technology',
        imageUrl: 'https://example.com/image.jpg',
        author: 'Dr. Smith',
        publishedAt: new Date().toISOString()
      };

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining(createDto));
    });
  });

  describe('findAll', () => {
    it('should return all active news articles', async () => {
      const mockArticles = [{ id: '1', title: 'Article 1' }];
      mockRepository.find.mockResolvedValue(mockArticles);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { publishedAt: 'DESC' },
      });
      expect(result).toEqual(mockArticles);
    });

    it('should filter by category', async () => {
      const category = 'technology';
      await service.findAll(category);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isActive: true, category },
        order: { publishedAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a news article by id', async () => {
      const articleId = 'article-1';
      const mockArticle = { id: articleId, title: 'Test Article' };
      mockRepository.findOneBy.mockResolvedValue(mockArticle);

      const result = await service.findOne(articleId);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: articleId });
      expect(result).toEqual(mockArticle);
    });
  });

  describe('update', () => {
    it('should update a news article', async () => {
      const articleId = 'article-1';
      const updateDto = { title: 'Updated Title' };
      const updatedArticle = { id: articleId, title: 'Updated Title' };
      
      mockRepository.findOneBy.mockResolvedValue(updatedArticle);

      const result = await service.update(articleId, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(articleId, updateDto);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: articleId });
      expect(result).toEqual(updatedArticle);
    });
  });

  describe('remove', () => {
    it('should remove a news article', async () => {
      const articleId = 'article-1';
      const result = await service.remove(articleId);

      expect(mockRepository.delete).toHaveBeenCalledWith(articleId);
      expect(result).toEqual({ affected: 1 });
    });
  });
});
