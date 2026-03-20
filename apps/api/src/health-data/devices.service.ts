import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDeviceDto } from './dto/device.dto';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listDevices(userId: string) {
    return this.prisma.userDevice.findMany({
      where: { userId },
      orderBy: { lastSyncAt: 'desc' },
    });
  }

  async updateDevice(id: string, dto: UpdateDeviceDto, userId: string) {
    const device = await this.prisma.userDevice.findFirst({
      where: { id, userId },
    });
    if (!device) throw new NotFoundException('Device not found');

    return this.prisma.userDevice.update({
      where: { id },
      data: {
        ...(dto.deviceName !== undefined && { deviceName: dto.deviceName }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteDevice(id: string, userId: string) {
    const device = await this.prisma.userDevice.findFirst({
      where: { id, userId },
    });
    if (!device) throw new NotFoundException('Device not found');

    const updated = await this.prisma.userDevice.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Device ${id} deactivated for user ${userId}`);
    return updated;
  }
}
