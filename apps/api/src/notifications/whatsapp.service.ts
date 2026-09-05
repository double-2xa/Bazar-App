import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type GuestMessageKind =
  | 'order_received'
  | 'order_confirmed'
  | 'order_on_the_way'
  | 'order_delivered'
  | 'order_cancelled'
  | 'wish_payment_confirmed';

const TEMPLATE_ENV: Record<GuestMessageKind, string> = {
  order_received: 'WHATSAPP_TEMPLATE_ORDER_RECEIVED',
  order_confirmed: 'WHATSAPP_TEMPLATE_ORDER_CONFIRMED',
  order_on_the_way: 'WHATSAPP_TEMPLATE_ORDER_ON_THE_WAY',
  order_delivered: 'WHATSAPP_TEMPLATE_ORDER_DELIVERED',
  order_cancelled: 'WHATSAPP_TEMPLATE_ORDER_CANCELLED',
  wish_payment_confirmed: 'WHATSAPP_TEMPLATE_WISH_PAYMENT_CONFIRMED',
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly prisma: PrismaService) {}

  private isEnabled() {
    return process.env.WHATSAPP_ENABLED === 'true';
  }

  private normalizeLebanesePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('00961')) return digits.slice(2);
    if (digits.startsWith('961')) return digits;
    if (digits.startsWith('0')) return `961${digits.slice(1)}`;
    return `961${digits}`;
  }

  private async sendTemplate(
    phone: string,
    kind: GuestMessageKind,
    parameters: string[],
    invoiceUrl?: string,
  ) {
    if (!this.isEnabled()) {
      this.logger.log(`[WhatsApp disabled] ${kind} queued conceptually for ${phone}`);
      return;
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env[TEMPLATE_ENV[kind]];
    const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';
    const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v23.0';
    if (!token || !phoneNumberId || !templateName) {
      this.logger.error(`WhatsApp is enabled but configuration for ${kind} is incomplete`);
      return;
    }

    const components: Record<string, unknown>[] = [];
    if (invoiceUrl) {
      components.push({
        type: 'header',
        parameters: [{ type: 'document', document: { link: invoiceUrl, filename: 'Nice-Price-Bazar-invoice.pdf' } }],
      });
    }
    components.push({
      type: 'body',
      parameters: parameters.map((text) => ({ type: 'text', text })),
    });

    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: this.normalizeLebanesePhone(phone),
        type: 'template',
        template: { name: templateName, language: { code: languageCode }, components },
      }),
    });
    if (!response.ok) {
      this.logger.error(`WhatsApp ${kind} failed (${response.status}): ${await response.text()}`);
    }
  }

  async notifyGuestOrder(orderId: string, kind: GuestMessageKind, invoiceToken?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { fullName: true, phone: true } } },
    });
    if (!order?.isGuest || !order.guestWhatsappOptIn || !order.user.phone) return;

    const invoiceUrl = invoiceToken && process.env.PUBLIC_API_URL
      ? `${process.env.PUBLIC_API_URL.replace(/\/$/, '')}/orders/guest-invoice/${invoiceToken}`
      : undefined;
    await this.sendTemplate(
      order.user.phone,
      kind,
      [order.user.fullName, order.orderNumber, order.totalAmount.toString()],
      kind === 'order_received' ? invoiceUrl : undefined,
    );
  }
}
