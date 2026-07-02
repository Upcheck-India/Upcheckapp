import { IsString, IsOptional, IsNumber, IsDateString, IsUUID, Min } from 'class-validator';

/**
 * Body for POST /credit. Deliberately has NO `id` field — the ledger row's
 * primary key must always come from the DB, never the client, or a caller
 * could POST another user's row id and (via `repo.create({ ...body })`)
 * overwrite/hijack it. `userId` is likewise omitted; the controller sources
 * it from the authenticated user.
 */
export class CreateCreditDto {
    @IsUUID()
    @IsOptional()
    cropId?: string;

    @IsString()
    dealerName: string;

    @IsNumber()
    @Min(0)
    principal: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    interestPct?: number;

    @IsDateString()
    startDate: string;

    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    repaid?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}
