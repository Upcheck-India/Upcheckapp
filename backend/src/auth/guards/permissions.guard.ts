import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, RolePermissions } from '../permissions.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.roles) {
      return false;
    }

    // Check if user has ANY of the required permissions via ANY of their roles
    // Assuming user can have multiple roles
    return user.roles.some((role: string) => {
      const userPermissions = RolePermissions[role] || [];
      if (userPermissions.includes('*')) return true;

      return requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );
    });
  }
}
