import { Injectable } from '@nestjs/common';
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

    findOne(id: string) {
        return this.alertsRepository.findOneBy({ id });
    }

    async markAsRead(id: string) {
        await this.alertsRepository.update(id, { isRead: true });
        return this.findOne(id);
    }

    async markAllAsRead(userId: string) {
        await this.alertsRepository.update({ userId, isRead: false }, { isRead: true });
        return { success: true };
    }

    remove(id: string) {
        return this.alertsRepository.delete(id);
    }

    async getUnreadCount(userId: string) {
        return this.alertsRepository.count({ where: { userId, isRead: false } });
    }
}
