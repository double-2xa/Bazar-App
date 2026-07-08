import { Controller, Get } from '@nestjs/common';
import { BannersService } from './banners.service';
import { Public } from '../common/decorators/roles.decorator';

@Controller('banners')
export class BannersController {
  constructor(private bannersService: BannersService) {}

  @Public()
  @Get()
  findAll() {
    return this.bannersService.findAll();
  }
}
