import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import {
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { SCOPE_KEYS } from '../common/dto/omit-scope';

/**
 * S1 (spec 2026-09-19 disease/health D0): no PATCH/PUT route may accept a
 * scope key from the body. OwnershipGuard authorizes the EXISTING row, so a
 * body `cropId`/`pondId`/`farmId` that survived the pipe would move the row
 * onto another farm.
 *
 * Discovers every PATCH/PUT handler in every controller (a new route is
 * covered automatically), sends a body made only of foreign scope ids through
 * the app's global pipe (main.ts), and asserts the result carries none of
 * them — either stripped, or the whole body rejected (400, nothing written).
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: false,
  transform: true,
});

const FOREIGN = '99999999-9999-4999-8999-999999999999';
const foreignBody = () =>
  Object.fromEntries(SCOPE_KEYS.map((k) => [k, FOREIGN]));

/**
 * Deliberate, reviewed exceptions: DTO name → scope keys it may keep.
 * - UpdateTransactionDto.pondId: re-tagging money to a pond; the service
 *   requires the pond to be on the transaction's own farm (tested in
 *   transactions.service.spec.ts).
 * - UpdateHarvestPlanDto: owned by the harvest workstream (H0), which fixes
 *   this DTO in its own PR. Remove this entry once H0 lands.
 */
const ALLOWED: Record<string, string[]> = {
  UpdateTransactionDto: ['pondId'],
  UpdateHarvestPlanDto: ['pondId', 'cropId'],
};

function controllerFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return controllerFiles(p);
    return e.name.endsWith('.controller.ts') ? [p] : [];
  });
}

type Route = { name: string; metatype: any };

function discoverUpdateRoutes(): Route[] {
  const routes: Route[] = [];
  for (const file of controllerFiles(path.join(__dirname, '..'))) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(file);
    for (const ctrl of Object.values<any>(mod)) {
      if (typeof ctrl !== 'function') continue;
      if (Reflect.getMetadata(PATH_METADATA, ctrl) === undefined) continue;
      for (const method of Object.getOwnPropertyNames(ctrl.prototype)) {
        const handler = ctrl.prototype[method];
        if (typeof handler !== 'function' || method === 'constructor') continue;
        const verb = Reflect.getMetadata(METHOD_METADATA, handler);
        if (verb !== RequestMethod.PATCH && verb !== RequestMethod.PUT) continue;
        const args =
          Reflect.getMetadata(ROUTE_ARGS_METADATA, ctrl, method) ?? {};
        const types =
          Reflect.getMetadata('design:paramtypes', ctrl.prototype, method) ??
          [];
        for (const [key, arg] of Object.entries<any>(args)) {
          if (Number(key.split(':')[0]) !== RouteParamtypes.BODY) continue;
          if (arg.data !== undefined) continue; // @Body('field') — a scalar
          routes.push({
            name: `${verb === RequestMethod.PATCH ? 'PATCH' : 'PUT'} ${ctrl.name}.${method}`,
            metatype: types[arg.index],
          });
        }
      }
    }
  }
  return routes;
}

const routes = discoverUpdateRoutes();

describe('S1: no update route accepts a scope key from the body', () => {
  it('found the update routes (sanity)', () => {
    const names = routes.map((r) => r.name).join('\n');
    for (const expected of [
      'CropsController.update',
      'TreatmentsController.update',
      'SamplingController.update',
      'FeedRecordsController.update',
      'PondsController.update',
      'TransactionsController.update',
      'DiseaseController.updateRecord',
      'MortalityController.update',
      'WaterQualityController.update',
      'ChemicalController.update',
      'MicrobiologyController.update',
      'PlanktonController.update',
      'FeedingTrayChecksController.update',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it.each(routes.map((r) => [r.name, r] as const))(
    '%s keeps no foreign scope key',
    async (_name, { metatype }) => {
      // An interface/`Partial<…>` body compiles to Object: the pipe skips it
      // entirely, which is exactly the S2 hole.
      expect(metatype?.name).toBeDefined();
      expect(metatype).not.toBe(Object);

      let out: Record<string, unknown>;
      try {
        out = await pipe.transform(foreignBody(), {
          type: 'body',
          metatype,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException); // rejected → no write
        return;
      }
      const allowed = ALLOWED[metatype.name] ?? [];
      const kept = SCOPE_KEYS.filter(
        (k) => out?.[k] !== undefined && !allowed.includes(k),
      );
      expect(kept).toEqual([]);
    },
  );
});
