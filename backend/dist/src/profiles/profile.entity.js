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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profile = void 0;
const typeorm_1 = require("typeorm");
let Profile = class Profile {
    id;
    updatedAt;
    username;
    fullName;
    avatarUrl;
    website;
    languagePreference;
};
exports.Profile = Profile;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], Profile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], Profile.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', unique: true, nullable: true }),
    __metadata("design:type", String)
], Profile.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'full_name', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Profile.prototype, "fullName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avatar_url', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Profile.prototype, "avatarUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Profile.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'language_preference', type: 'text', default: 'en', nullable: true }),
    __metadata("design:type", String)
], Profile.prototype, "languagePreference", void 0);
exports.Profile = Profile = __decorate([
    (0, typeorm_1.Entity)('profiles')
], Profile);
//# sourceMappingURL=profile.entity.js.map