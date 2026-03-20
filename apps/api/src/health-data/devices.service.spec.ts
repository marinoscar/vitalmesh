import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/mocks/prisma.mock';
import { UpdateDeviceDto } from './dto/device.dto';

describe('DevicesService', () => {
  let service: DevicesService;
  let mockPrisma: MockPrismaService;

  const userId = 'user-abc';

  const mockDevice = {
    id: 'device-1',
    userId,
    deviceName: 'Pixel 8',
    deviceModel: 'Pixel 8',
    deviceManufacturer: 'Google',
    deviceOs: 'Android 14',
    deviceType: 'phone',
    appVersion: '1.0.0',
    isActive: true,
    lastSyncAt: new Date('2024-01-15T10:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockDevice2 = {
    id: 'device-2',
    userId,
    deviceName: 'Galaxy Watch 6',
    deviceModel: 'Galaxy Watch 6',
    deviceManufacturer: 'Samsung',
    deviceOs: 'Wear OS 4',
    deviceType: 'watch',
    appVersion: '2.0.0',
    isActive: true,
    lastSyncAt: new Date('2024-01-14T08:00:00Z'),
    createdAt: new Date('2024-01-02T00:00:00Z'),
  };

  beforeEach(async () => {
    mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // listDevices
  // ============================================================

  describe('listDevices', () => {
    it('should return user devices ordered by lastSyncAt descending', async () => {
      mockPrisma.userDevice.findMany.mockResolvedValue([
        mockDevice,
        mockDevice2,
      ] as any);

      const result = await service.listDevices(userId);

      expect(mockPrisma.userDevice.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { lastSyncAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('device-1');
    });

    it('should return empty array when user has no devices', async () => {
      mockPrisma.userDevice.findMany.mockResolvedValue([]);

      const result = await service.listDevices(userId);

      expect(result).toEqual([]);
    });

    it('should only return devices belonging to the specified user', async () => {
      mockPrisma.userDevice.findMany.mockResolvedValue([mockDevice] as any);

      await service.listDevices(userId);

      expect(mockPrisma.userDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } }),
      );
    });
  });

  // ============================================================
  // updateDevice
  // ============================================================

  describe('updateDevice', () => {
    it('should update device name', async () => {
      const dto: UpdateDeviceDto = { deviceName: 'My Pixel 8' };
      const updatedDevice = { ...mockDevice, deviceName: 'My Pixel 8' };

      mockPrisma.userDevice.findFirst.mockResolvedValue(mockDevice as any);
      mockPrisma.userDevice.update.mockResolvedValue(updatedDevice as any);

      const result = await service.updateDevice('device-1', dto, userId);

      expect(mockPrisma.userDevice.findFirst).toHaveBeenCalledWith({
        where: { id: 'device-1', userId },
      });
      expect(mockPrisma.userDevice.update).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        data: { deviceName: 'My Pixel 8' },
      });
      expect(result.deviceName).toBe('My Pixel 8');
    });

    it('should update isActive status', async () => {
      const dto: UpdateDeviceDto = { isActive: false };
      const updatedDevice = { ...mockDevice, isActive: false };

      mockPrisma.userDevice.findFirst.mockResolvedValue(mockDevice as any);
      mockPrisma.userDevice.update.mockResolvedValue(updatedDevice as any);

      const result = await service.updateDevice('device-1', dto, userId);

      expect(mockPrisma.userDevice.update).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('should not include undefined fields in update data', async () => {
      const dto: UpdateDeviceDto = { deviceName: 'Renamed' };

      mockPrisma.userDevice.findFirst.mockResolvedValue(mockDevice as any);
      mockPrisma.userDevice.update.mockResolvedValue({
        ...mockDevice,
        deviceName: 'Renamed',
      } as any);

      await service.updateDevice('device-1', dto, userId);

      const updateCall = mockPrisma.userDevice.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('isActive');
    });

    it('should throw NotFoundException when device not owned by user', async () => {
      mockPrisma.userDevice.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDevice('device-1', { deviceName: 'x' }, userId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.updateDevice('device-1', { deviceName: 'x' }, userId),
      ).rejects.toThrow('Device not found');

      expect(mockPrisma.userDevice.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when device does not exist', async () => {
      mockPrisma.userDevice.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDevice('nonexistent-device', {}, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // deleteDevice
  // ============================================================

  describe('deleteDevice', () => {
    it('should soft deactivate device by setting isActive to false', async () => {
      const deactivatedDevice = { ...mockDevice, isActive: false };

      mockPrisma.userDevice.findFirst.mockResolvedValue(mockDevice as any);
      mockPrisma.userDevice.update.mockResolvedValue(deactivatedDevice as any);

      const result = await service.deleteDevice('device-1', userId);

      expect(mockPrisma.userDevice.findFirst).toHaveBeenCalledWith({
        where: { id: 'device-1', userId },
      });
      expect(mockPrisma.userDevice.update).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when device not found', async () => {
      mockPrisma.userDevice.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteDevice('nonexistent-device', userId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.deleteDevice('nonexistent-device', userId),
      ).rejects.toThrow('Device not found');

      expect(mockPrisma.userDevice.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when device belongs to a different user', async () => {
      mockPrisma.userDevice.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteDevice('device-1', 'different-user'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.userDevice.findFirst).toHaveBeenCalledWith({
        where: { id: 'device-1', userId: 'different-user' },
      });
    });

    it('should not hard delete the device record', async () => {
      mockPrisma.userDevice.findFirst.mockResolvedValue(mockDevice as any);
      mockPrisma.userDevice.update.mockResolvedValue({
        ...mockDevice,
        isActive: false,
      } as any);

      await service.deleteDevice('device-1', userId);

      expect(mockPrisma.userDevice.delete).not.toHaveBeenCalled();
    });
  });
});
