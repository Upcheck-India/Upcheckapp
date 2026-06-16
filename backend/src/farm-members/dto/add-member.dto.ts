import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { FarmRole } from '../../farm-access/farm-member.entity';

/** Roles a member can be invited/added as. Ownership is transferred separately. */
export type AssignableRole = Exclude<FarmRole, 'owner'>;

export class AddMemberDto {
    @IsUUID()
    userId: string;

    // owner→manager/worker/viewer, manager→worker (enforced in the service via
    // canAssignRole). Defaults to 'worker' when omitted.
    @IsOptional()
    @IsIn(['manager', 'worker', 'viewer'])
    role?: AssignableRole;
}
