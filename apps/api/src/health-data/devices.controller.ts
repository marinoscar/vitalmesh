import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/roles.constants';
import { DevicesService } from './devices.service';
import { updateDeviceSchema, UpdateDeviceDto } from './dto/device.dto';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'List all devices for the current user' })
  @ApiResponse({ status: 200, description: 'List of registered devices' })
  async listDevices(@CurrentUser('id') userId: string) {
    const data = await this.devicesService.listDevices(userId);
    return { data };
  }

  @Patch(':id')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Update a device name or active status' })
  @ApiParam({ name: 'id', description: 'Device ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Updated device' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async updateDevice(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDeviceSchema)) dto: UpdateDeviceDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.devicesService.updateDevice(id, dto, userId);
    return { data };
  }

  @Delete(':id')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Deactivate a device (soft delete)' })
  @ApiParam({ name: 'id', description: 'Device ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Device deactivated' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async deleteDevice(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.devicesService.deleteDevice(id, userId);
    return { data };
  }
}
