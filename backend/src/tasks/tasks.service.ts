import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task)
        private tasksRepository: Repository<Task>,
    ) { }

    create(createDto: CreateTaskDto, createdById?: string) {
        const record = this.tasksRepository.create({
            ...createDto,
            createdById: createdById ?? null,
            completedAt: createDto.status === 'done' ? new Date() : null,
        });
        return this.tasksRepository.save(record);
    }

    findAll(filters: { farmId?: string; status?: string; assignedToId?: string } = {}) {
        const where: Record<string, string> = {};
        if (filters.farmId) where.farmId = filters.farmId;
        if (filters.status) where.status = filters.status;
        if (filters.assignedToId) where.assignedToId = filters.assignedToId;
        return this.tasksRepository.find({
            where,
            order: { status: 'ASC', dueDate: 'ASC', createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<Task> {
        const record = await this.tasksRepository.findOneBy({ id });
        if (!record) throw new NotFoundException(`Task with ID ${id} not found`);
        return record;
    }

    async update(id: string, updateDto: UpdateTaskDto): Promise<Task> {
        const existing = await this.findOne(id);
        const patch: Partial<Task> = { ...updateDto };
        // Maintain completedAt in lockstep with status transitions.
        if (updateDto.status && updateDto.status !== existing.status) {
            patch.completedAt = updateDto.status === 'done' ? new Date() : null;
        }
        await this.tasksRepository.update(id, patch);
        return this.findOne(id);
    }

    async remove(id: string): Promise<{ message: string }> {
        await this.findOne(id);
        await this.tasksRepository.delete(id);
        return { message: 'Task deleted successfully' };
    }
}
