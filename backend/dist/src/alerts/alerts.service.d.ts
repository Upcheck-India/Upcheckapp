import { Repository } from 'typeorm';
import { Alert } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
export declare class AlertsService {
    private alertsRepository;
    constructor(alertsRepository: Repository<Alert>);
    create(createDto: CreateAlertDto): Promise<Alert>;
    findByUser(userId: string, unreadOnly?: boolean): Promise<Alert[]>;
    findOne(id: string): Promise<Alert | null>;
    markAsRead(id: string): Promise<Alert | null>;
    markAllAsRead(userId: string): Promise<{
        success: boolean;
    }>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
    getUnreadCount(userId: string): Promise<number>;
}
