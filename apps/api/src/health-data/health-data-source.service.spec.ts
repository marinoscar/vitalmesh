import { Test, TestingModule } from '@nestjs/testing';
import { SourceType } from '@prisma/client';
import { HealthDataSourceService } from './health-data-source.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/mocks/prisma.mock';
import { SyncSourceDto } from './dto/sync-metrics.dto';

describe('HealthDataSourceService', () => {
  let service: HealthDataSourceService;
  let mockPrisma: MockPrismaService;

  const userId = 'user-abc';

  const mockSourceDto: SyncSourceDto = {
    deviceName: 'Pixel 8',
    deviceModel: 'Pixel 8',
    deviceManufacturer: 'Google',
    deviceOs: 'Android 14',
    deviceType: 'phone',
    appVersion: '1.2.3',
  };

  beforeEach(async () => {
    mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthDataSourceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<HealthDataSourceService>(HealthDataSourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // ensureDevice
  // ============================================================

  describe('ensureDevice', () => {
    it('should create new device when it does not exist', async () => {
      const newDevice = {
        id: 'device-new',
        userId,
        deviceName: 'Pixel 8',
        deviceModel: 'Pixel 8',
        isActive: true,
        lastSyncAt: new Date(),
      };

      mockPrisma.userDevice.upsert.mockResolvedValue(newDevice as any);

      const result = await service.ensureDevice(mockSourceDto, userId);

      expect(mockPrisma.userDevice.upsert).toHaveBeenCalledWith({
        where: {
          userId_deviceName_deviceModel: {
            userId,
            deviceName: 'Pixel 8',
            deviceModel: 'Pixel 8',
          },
        },
        create: {
          userId,
          deviceName: 'Pixel 8',
          deviceModel: 'Pixel 8',
          deviceManufacturer: 'Google',
          deviceOs: 'Android 14',
          deviceType: 'phone',
          appVersion: '1.2.3',
          lastSyncAt: expect.any(Date),
        },
        update: {
          lastSyncAt: expect.any(Date),
          appVersion: '1.2.3',
          deviceOs: 'Android 14',
          deviceManufacturer: 'Google',
        },
      });
      expect(result).toBe('device-new');
    });

    it('should update existing device lastSyncAt and appVersion', async () => {
      const existingDevice = {
        id: 'device-existing',
        userId,
        deviceName: 'Pixel 8',
        lastSyncAt: new Date('2024-01-10T00:00:00Z'),
        appVersion: '1.0.0',
      };

      mockPrisma.userDevice.upsert.mockResolvedValue({
        ...existingDevice,
        lastSyncAt: new Date(),
        appVersion: '1.2.3',
      } as any);

      const result = await service.ensureDevice(mockSourceDto, userId);

      expect(mockPrisma.userDevice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            lastSyncAt: expect.any(Date),
            appVersion: '1.2.3',
          }),
        }),
      );
      expect(result).toBe('device-existing');
    });

    it('should return device id', async () => {
      mockPrisma.userDevice.upsert.mockResolvedValue({
        id: 'device-uuid-123',
        userId,
      } as any);

      const result = await service.ensureDevice(mockSourceDto, userId);

      expect(result).toBe('device-uuid-123');
    });

    it('should use null for deviceModel when not provided', async () => {
      const sourceWithoutModel: SyncSourceDto = {
        deviceName: 'Unknown Device',
        deviceOs: 'Android',
        deviceType: 'phone',
        appVersion: '1.0.0',
      };

      mockPrisma.userDevice.upsert.mockResolvedValue({
        id: 'device-no-model',
        userId,
      } as any);

      await service.ensureDevice(sourceWithoutModel, userId);

      expect(mockPrisma.userDevice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_deviceName_deviceModel: {
              userId,
              deviceName: 'Unknown Device',
              deviceModel: null,
            },
          },
        }),
      );
    });
  });

  // ============================================================
  // registerSource
  // ============================================================

  describe('registerSource', () => {
    const deviceId = 'device-456';

    it('should upsert data source with userId, deviceId, and sourceType', async () => {
      mockPrisma.healthDataSource.upsert.mockResolvedValue({
        id: 'source-1',
      } as any);

      await service.registerSource(
        userId,
        deviceId,
        'com.google.fit',
        SourceType.android_health_connect,
      );

      expect(mockPrisma.healthDataSource.upsert).toHaveBeenCalledWith({
        where: {
          userId_sourceType_packageName: {
            userId,
            sourceType: SourceType.android_health_connect,
            packageName: 'com.google.fit',
          },
        },
        create: {
          userId,
          deviceId,
          sourceType: SourceType.android_health_connect,
          packageName: 'com.google.fit',
          lastSeenAt: expect.any(Date),
        },
        update: {
          lastSeenAt: expect.any(Date),
          deviceId,
        },
      });
    });

    it('should handle undefined dataOrigin by passing null as packageName', async () => {
      mockPrisma.healthDataSource.upsert.mockResolvedValue({
        id: 'source-2',
      } as any);

      await service.registerSource(
        userId,
        deviceId,
        undefined,
        SourceType.lab_upload,
      );

      expect(mockPrisma.healthDataSource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_sourceType_packageName: {
              userId,
              sourceType: SourceType.lab_upload,
              packageName: null,
            },
          },
          create: expect.objectContaining({
            packageName: undefined,
          }),
        }),
      );
    });

    it('should update lastSeenAt on subsequent calls for same source', async () => {
      const existingSource = { id: 'source-existing', lastSeenAt: new Date('2024-01-01') };
      mockPrisma.healthDataSource.upsert.mockResolvedValue({
        ...existingSource,
        lastSeenAt: new Date(),
        deviceId,
      } as any);

      await service.registerSource(
        userId,
        deviceId,
        'com.samsung.health',
        SourceType.android_health_connect,
      );

      expect(mockPrisma.healthDataSource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            lastSeenAt: expect.any(Date),
            deviceId,
          }),
        }),
      );
    });

    it('should not return a value (void function)', async () => {
      mockPrisma.healthDataSource.upsert.mockResolvedValue({ id: 'source-3' } as any);

      const result = await service.registerSource(
        userId,
        deviceId,
        'com.test.app',
        SourceType.android_health_connect,
      );

      expect(result).toBeUndefined();
    });

    it('should support lab_upload source type', async () => {
      mockPrisma.healthDataSource.upsert.mockResolvedValue({ id: 'source-lab' } as any);

      await service.registerSource(
        userId,
        deviceId,
        undefined,
        SourceType.lab_upload,
      );

      expect(mockPrisma.healthDataSource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            sourceType: SourceType.lab_upload,
          }),
        }),
      );
    });
  });
});
