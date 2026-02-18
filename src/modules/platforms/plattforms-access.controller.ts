/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/JwtAuthGuard.guard';
import { PlatformsService } from './platforms.service';

@UseGuards(JwtAuthGuard)
@Controller('platforms')
export class PlatformsAccessController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Get('me/access')
  getMyPlatforms(@Request() req: any) {
    console.log(req.user);
    return this.platformsService.getAccessiblePlatforms(req.user.id);
  }
}
