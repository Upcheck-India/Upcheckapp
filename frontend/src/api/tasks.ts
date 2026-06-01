import apiClient from './client';

export interface Task {
    id: string;
    farmId: string;
    pondId?: string | null;
    cropId?: string | null;
    title: string;
    description?: string | null;
    /** 'open' | 'in_progress' | 'done' */
    status: string;
    /** 'low' | 'medium' | 'high' */
    priority: string;
    dueDate?: string | null;
    assignedToId?: string | null;
    createdById?: string | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTaskDto {
    farmId: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    pondId?: string;
    cropId?: string;
    assignedToId?: string;
}

export type UpdateTaskDto = Partial<Omit<CreateTaskDto, 'farmId'>>;

export const tasksApi = {
    getAll: (farmId: string, params?: { status?: string; assignedToId?: string }) =>
        apiClient.get<Task[]>('/tasks', { params: { farmId, ...params } }),

    getById: (id: string) => apiClient.get<Task>(`/tasks/${id}`),

    create: (data: CreateTaskDto) => apiClient.post<Task>('/tasks', data),

    update: (id: string, data: UpdateTaskDto) => apiClient.patch<Task>(`/tasks/${id}`, data),

    delete: (id: string) => apiClient.delete(`/tasks/${id}`),
};
