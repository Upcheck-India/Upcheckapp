/**
 * Core Flow E2E Test
 *
 * IMPORTANT: This test requires a running PostgreSQL database.
 * It uses the same DATABASE_URL as the main app (loaded from .env via jest-setup.ts).
 *
 * Run with: npx jest --config ./test/jest-e2e.json --testPathPatterns core-flow --testTimeout 60000
 *
 * The entities use Postgres-specific types (e.g. "timestamp with time zone")
 * so SQLite in-memory databases cannot be used.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { randomUUID } from 'crypto';

describe('Core Flow (e2e)', () => {
    let app: INestApplication;
    let authToken: string;
    let farmId: string;
    let pondId: string;

    // Generate unique identifiers for this test run
    const testId = randomUUID().slice(0, 8);
    const testEmail = `e2e_${testId}@test.com`;
    const testUsername = `e2e${testId}`;
    const testPassword = 'StrongPassword123!';

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();
    }, 60000);

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    it('1. Register User', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: testEmail,
                username: testUsername,
                password: testPassword,
                firstName: 'E2E',
                lastName: 'Test',
            })
            .expect(201);

        // If register returns a token, use it
        if (response.body.accessToken) {
            authToken = response.body.accessToken;
        }
    });

    it('2. Login User', async () => {
        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ emailOrPhone: testEmail, password: testPassword })
            .expect(200);

        authToken = loginResponse.body.accessToken;
        expect(authToken).toBeDefined();
    });

    it('3. Create Farm', async () => {
        const response = await request(app.getHttpServer())
            .post('/farms')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: `E2E Farm ${testId}`,
                address: '123 Test Lane',
            })
            .expect(201);

        farmId = response.body.id;
        expect(farmId).toBeDefined();
    });

    it('4. Create Pond', async () => {
        const response = await request(app.getHttpServer())
            .post('/ponds')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                farmId,
                namePrefix: 'P',
                batchCount: 1,
                widthM: 100,
                lengthM: 100,
                depthM: 2,
                geometryType: 'rectangular',
                constructionType: 'earthen',
                displayName: `E2E Pond ${testId}`,
            })
            .expect(201);

        pondId = response.body.pond?.id || response.body.id;
        expect(pondId).toBeDefined();
    });

    it('5. Create Crop', async () => {
        const response = await request(app.getHttpServer())
            .post('/crops')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                pondId,
                name: `E2E Cycle ${testId}`,
                cropCode: `E2E${testId}`,
                speciesType: 'vannamei',
                stockingDate: new Date().toISOString(),
                stockingCount: 100000,
                status: 'active',
            })
            .expect(201);

        const cropId = response.body.id;
        expect(cropId).toBeDefined();
    });
});
