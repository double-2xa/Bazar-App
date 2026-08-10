import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { WhishClient, parseCallbackUrl } from 'whish-pay';

@Injectable()
export class WhishService {
  private readonly logger = new Logger(WhishService.name);
  private client: WhishClient | null = null;

  private getClient(): WhishClient {
    if (this.client) return this.client;

    const channel = process.env.WHISH_CHANNEL?.trim();
    const secret = process.env.WHISH_SECRET?.trim();
    const websiteUrl = process.env.WHISH_WEBSITE_URL?.trim();
    if (!channel || !secret || !websiteUrl) {
      throw new ServiceUnavailableException(
        'Wish Money payments are not configured. Set WHISH_CHANNEL, WHISH_SECRET, and WHISH_WEBSITE_URL.',
      );
    }

    const environment =
      process.env.WHISH_ENVIRONMENT === 'production' ? 'production' : 'sandbox';

    this.client = new WhishClient({
      channel,
      secret,
      websiteUrl,
      environment,
    });
    return this.client;
  }

  /** Public API base including `/api`, e.g. https://api.example.com/api */
  getPublicApiBase(): string {
    const base = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
    if (!base) {
      throw new ServiceUnavailableException(
        'PUBLIC_API_URL is required for Wish Money callbacks and redirects.',
      );
    }
    return base;
  }

  generateExternalId(): number {
    return this.getClient().generateExternalId();
  }

  async createPayment(params: {
    amount: number;
    orderNumber: string;
    externalId: number;
    orderId: string;
  }) {
    const client = this.getClient();
    const apiBase = this.getPublicApiBase();

    const result = await client.createPayment({
      amount: params.amount,
      currency: 'USD',
      invoice: `Order ${params.orderNumber}`,
      externalId: params.externalId,
      successCallbackUrl: `${apiBase}/whish/callback/success`,
      failureCallbackUrl: `${apiBase}/whish/callback/failure`,
      successRedirectUrl: `${apiBase}/whish/redirect/success?orderId=${encodeURIComponent(params.orderId)}`,
      failureRedirectUrl: `${apiBase}/whish/redirect/failure?orderId=${encodeURIComponent(params.orderId)}`,
    });

    return result;
  }

  async getPaymentStatus(externalId: number) {
    return this.getClient().getPaymentStatus('USD', externalId);
  }

  parseCallback(urlOrQuery: string) {
    try {
      return parseCallbackUrl(urlOrQuery);
    } catch (err) {
      this.logger.warn(`Failed to parse Whish callback: ${String(err)}`);
      return { externalId: null, currency: null as 'USD' | 'LBP' | 'AED' | null };
    }
  }
}
