import { SetMetadata } from '@nestjs/common';

export const OWNS_RESOURCE_KEY = 'ownsResource';

export interface OwnsResourceOptions {
    entityType: string;
    paramName: string;
    ownerPath: string;
}

export const OwnsResource = (entityType: string, paramName: string = 'id', ownerPath: string = 'userId') =>
    SetMetadata(OWNS_RESOURCE_KEY, { entityType, paramName, ownerPath } as OwnsResourceOptions);
