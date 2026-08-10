import { Controller, Get, Query, Req, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators/roles.decorator';
import { OrdersService } from '../orders/orders.service';
import { WhishService } from './whish.service';

@Controller('whish')
export class WhishController {
  private readonly logger = new Logger(WhishController.name);

  constructor(
    private whishService: WhishService,
    private ordersService: OrdersService,
  ) {}

  @Public()
  @Get('callback/success')
  async successCallback(@Req() req: { url?: string; originalUrl?: string; protocol?: string; get?: (h: string) => string }) {
    const raw = this.absoluteCallbackUrl(req);
    const parsed = this.whishService.parseCallback(raw);
    this.logger.log(`Whish success callback externalId=${parsed.externalId}`);
    if (parsed.externalId != null) {
      await this.ordersService.confirmWhishPaymentByExternalId(String(parsed.externalId));
    }
    return { ok: true };
  }

  @Public()
  @Get('callback/failure')
  async failureCallback(@Req() req: { url?: string; originalUrl?: string; protocol?: string; get?: (h: string) => string }) {
    const raw = this.absoluteCallbackUrl(req);
    const parsed = this.whishService.parseCallback(raw);
    this.logger.warn(`Whish failure callback externalId=${parsed.externalId}`);
    return { ok: true };
  }

  @Public()
  @Get('redirect/success')
  successRedirect(@Query('orderId') orderId: string | undefined, @Res() res: Response) {
    res.type('html').send(this.appReturnHtml(orderId || '', 'success'));
  }

  @Public()
  @Get('redirect/failure')
  failureRedirect(@Query('orderId') orderId: string | undefined, @Res() res: Response) {
    res.type('html').send(this.appReturnHtml(orderId || '', 'failure'));
  }

  private absoluteCallbackUrl(req: { url?: string; originalUrl?: string }) {
    const path = req.originalUrl || req.url || '';
    if (/^https?:\/\//i.test(path)) return path;
    // parseCallbackUrl only needs query params; host can be a placeholder
    return `http://localhost${path.startsWith('/') ? path : `/${path}`}`;
  }

  private appReturnHtml(orderId: string, status: 'success' | 'failure') {
    const deepLink = `nicepricebazar://whish-return?orderId=${encodeURIComponent(orderId)}&status=${status}`;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Returning to Nice Price Bazar…</title>
  <meta http-equiv="refresh" content="0;url=${deepLink}" />
</head>
<body style="font-family: system-ui, sans-serif; text-align: center; padding: 48px 16px;">
  <p>Payment ${status === 'success' ? 'received' : 'was not completed'}.</p>
  <p><a href="${deepLink}">Tap here to return to the app</a></p>
  <script>window.location.href = ${JSON.stringify(deepLink)};</script>
</body>
</html>`;
  }
}
