import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

// Get current user from request
export const GetUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        return data ? user?.[data] : user;
    },
);

// Get user ID specifically
export const GetUserId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();
        return request.user.userId;
    },
);

// Mark routes as public (skip auth)
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Optional auth (allows both authenticated and non-authenticated)
export const OptionalAuth = () => SetMetadata('optionalAuth', true);
