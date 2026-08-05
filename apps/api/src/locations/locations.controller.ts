import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/roles.decorator';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Public()
  @Get('lebanon/hierarchy')
  getHierarchy() {
    return this.locationsService.getHierarchy();
  }

  @Public()
  @Get('lebanon/settlements')
  findSettlements(
    @Query('governorate') governorate?: string,
    @Query('district') district?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.locationsService.findSettlements({
      governorate,
      district,
      q,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Public()
  @Get('lebanon/settlements/:id')
  findOne(@Param('id') id: string) {
    const settlement = this.locationsService.findOne(id);
    if (!settlement) throw new NotFoundException('Settlement not found');
    return settlement;
  }
}
