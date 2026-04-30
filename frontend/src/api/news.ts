import apiClient from './client';

export interface NewsArticle {
    id: string;
    title: string;
    summary?: string;
    content?: string;
    category?: string;
    imageUrl?: string;
    publishedAt: string;
    createdAt: string;
}

export const newsApi = {
    getAll: () =>
        apiClient.get<NewsArticle[]>('/news'),

    getById: (id: string) =>
        apiClient.get<NewsArticle>(`/news/${id}`),
};