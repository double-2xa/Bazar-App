import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/decorators/roles.decorator";
import { BRAND } from "@doublea/shared";

@Controller()
export class AppController {
  @Public()
  @Get()
  getRoot() {
    return {
      message: `${BRAND.shopName} API is running`,
      docs: "/api/products",
      health: "/api/health",
    };
  }

  @Public()
  @Get("health")
  getHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}