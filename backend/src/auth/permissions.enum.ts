export enum Permission {
    // Users
    CREATE_USER = 'create:user',
    READ_USER = 'read:user',
    UPDATE_USER = 'update:user',
    DELETE_USER = 'delete:user',

    // Farms
    CREATE_FARM = 'create:farm',
    READ_FARM = 'read:farm',
    UPDATE_FARM = 'update:farm',
    DELETE_FARM = 'delete:farm',

    // Data
    CREATE_DATA = 'create:data',
    READ_DATA = 'read:data',
    UPDATE_DATA = 'update:data',
    DELETE_DATA = 'delete:data',

    // Reports
    VIEW_REPORTS = 'view:reports',
    EXPORT_REPORTS = 'export:reports',
}

export const RolePermissions: Record<string, string[]> = {
    super_admin: ['*'],
    farm_owner: [
        'create:farm', 'read:farm', 'update:farm', 'delete:farm',
        'create:user', 'read:user', 'update:user',
        'read:data', 'view:reports', 'export:reports'
    ],
    farm_manager: [
        'read:farm', 'update:farm',
        'create:user', 'read:user',
        'create:data', 'read:data', 'update:data',
        'view:reports'
    ],
    worker: [
        'read:farm',
        'create:data', 'read:data', 'update:data'
    ],
    auditor: [
        'read:farm', 'read:data', 'view:reports'
    ]
};
