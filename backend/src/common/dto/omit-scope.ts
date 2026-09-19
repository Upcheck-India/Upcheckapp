import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from '@nestjs/common';

/**
 * Keys that decide WHERE a row lives (tenant scope) or WHO wrote it. They are
 * set once at create time and never patchable: `OwnershipGuard` authorizes a
 * PATCH against the EXISTING row (`params.id`), so a scope key accepted from
 * the body would let a caller move their own record onto another farm's crop
 * or pond (spec 2026-09-19 disease/health D0, S1).
 */
export const SCOPE_KEYS = [
  'id',
  'farmId',
  'pondId',
  'cropId',
  'createdById',
  'updatedById',
] as const;
export type ScopeKey = (typeof SCOPE_KEYS)[number];

/**
 * `PartialType(OmitType(Create, <every scope key it has>))` — the update-DTO
 * base. With the global `whitelist: true` pipe, scope keys in a PATCH body are
 * stripped before they reach the service.
 */
export function PartialWithoutScope<T>(
  classRef: Type<T>,
): Type<Partial<Omit<T, ScopeKey>>> {
  // OmitType ignores keys the class doesn't have, so the full list is safe.
  return PartialType(
    OmitType(classRef, SCOPE_KEYS as unknown as readonly (keyof T)[]),
  ) as unknown as Type<Partial<Omit<T, ScopeKey>>>;
}
