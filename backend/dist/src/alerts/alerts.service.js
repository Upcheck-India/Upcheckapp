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
exports.AlertsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const alert_entity_1 = require("./alert.entity");
let AlertsService = class AlertsService {
    alertsRepository;
    constructor(alertsRepository) {
        this.alertsRepository = alertsRepository;
    }
    create(createDto) {
        const alert = this.alertsRepository.create(createDto);
        return this.alertsRepository.save(alert);
    }
    findByUser(userId, unreadOnly = false) {
        const where = { userId };
        if (unreadOnly)
            where.isRead = false;
        return this.alertsRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }
    findOne(id) {
        return this.alertsRepository.findOneBy({ id });
    }
    async markAsRead(id) {
        await this.alertsRepository.update(id, { isRead: true });
        return this.findOne(id);
    }
    async markAllAsRead(userId) {
        await this.alertsRepository.update({ userId, isRead: false }, { isRead: true });
        return { success: true };
    }
    remove(id) {
        return this.alertsRepository.delete(id);
    }
    async getUnreadCount(userId) {
        return this.alertsRepository.count({ where: { userId, isRead: false } });
    }
};
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(alert_entity_1.Alert)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AlertsService);
//# sourceMappingURL=alerts.service.js.map