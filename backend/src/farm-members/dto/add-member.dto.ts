import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddMemberDto {
    @IsUUID()
    userId: string;

    @IsOptional()
    @IsIn(['worker'])
    role?: 'worker';
}
