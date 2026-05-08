import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
    constructor(
        @InjectRepository(Alert)
        private alertsRepository: Repository<Alert>,
    ) { }

    create(createDto: CreateAlertDto) {
        const alert = this.alertsRepository.create(createDto);
        return this.alertsRepository.save(alert);
    }

    async createAutoAlert(
        userId: string,
        farmId: string,
        type: string,
        title: string,
        message: string,
        severity: 'info' | 'warning' | 'critical' = 'info',
        data?: Record<string, any>,
        pondId?: string,
    ) {
        const alert = this.alertsRepository.create({
            userId,
            farmId,
            type,
            title,
            message,
            severity,
            data,
            pondId,
            isRead: false,
            isPushSent: false,
        });
        return this.alertsRepository.save(alert);
    }

    findByUser(userId: string, unreadOnly = false) {
        const where: any = { userId };
        if (unreadOnly) where.isRead = false;
        return this.alertsRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<Alert> {
        const alert = await this.alertsRepository.findOneBy({ id });
        if (!alert) throw new NotFoundException(`Alert with ID ${id} not found`);
        return alert;
    }

    async findOneForUser(id: string, userId: string): Promise<Alert> {
        const alert = await this.findOne(id);
        if (alert.userId !== userId) {
            throw new ForbiddenException('You do not have permission to access this alert');
        }
        return alert;
    }

    async markAsRead(id: string) {
        await this.findOne(id);
        await this.alertsRepository.update(id, { isRead: true });
        return this.findOne(id);
    }

    async markAllAsRead(userId: string) {
        await this.alertsRepository.update({ userId, isRead: false }, { isRead: true });
        return { success: true };
    }

    async remove(id: string): Promise<{ message: string }> {
        await this.findOne(id);
        await this.alertsRepository.delete(id);
        return { message: 'Alert deleted successfully' };
    }

    async removeForUser(id: string, userId: string): Promise<{ message: string }> {
        await this.findOneForUser(id, userId);
        await this.alertsRepository.delete(id);
        return { message: 'Alert deleted successfully' };
    }

    async getUnreadCount(userId: string) {
        return this.alertsRepository.count({ where: { userId, isRead: false } });
    }
}
