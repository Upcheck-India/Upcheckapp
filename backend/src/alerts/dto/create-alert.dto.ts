import { IsString, IsOptional, IsUUID, IsIn } from 'class-validator';

export class CreateAlertDto {
    @IsUUID()
    userId: string;

    @IsString()
    type: string;

    @IsString()
    title: string;

    @IsString()
    message: string;

    @IsString()
    @IsOptional()
    @IsIn(['info', 'warning', 'critical'])
    severity?: string;

    @IsUUID()
    @IsOptional()
    pondId?: string;

    @IsUUID()
    @IsOptional()
    farmId?: string;
}
