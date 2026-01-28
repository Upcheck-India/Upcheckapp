import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
export declare class AlertsController {
    private readonly alertsService;
    constructor(alertsService: AlertsService);
    create(createDto: CreateAlertDto): Promise<import("./alert.entity").Alert>;
    findByUser(userId: string, unreadOnly?: string): Promise<import("./alert.entity").Alert[]>;
    getUnreadCount(userId: string): Promise<number>;
    markAsRead(id: string): Promise<import("./alert.entity").Alert | null>;
    markAllAsRead(userId: string): Promise<{
        success: boolean;
    }>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
