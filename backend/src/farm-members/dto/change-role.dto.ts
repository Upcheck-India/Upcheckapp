import { IsIn } from 'class-validator';
import type { AssignableRole } from './add-member.dto';

export class ChangeRoleDto {
  @IsIn(['manager', 'worker', 'viewer'])
  role: AssignableRole;
}
