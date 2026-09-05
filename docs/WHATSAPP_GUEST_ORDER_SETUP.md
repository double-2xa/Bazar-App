# WhatsApp guest-order notifications

Guest checkout works without WhatsApp. Keep `WHATSAPP_ENABLED=false` until a Meta
WhatsApp Cloud API app, permanent access token, phone-number ID, and approved
message templates are ready.

Configure these API environment variables later:

```env
WHATSAPP_ENABLED=false
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_GRAPH_API_VERSION=v23.0
WHATSAPP_TEMPLATE_LANGUAGE=en
WHATSAPP_TEMPLATE_ORDER_RECEIVED=
WHATSAPP_TEMPLATE_ORDER_CONFIRMED=
WHATSAPP_TEMPLATE_ORDER_ON_THE_WAY=
WHATSAPP_TEMPLATE_ORDER_DELIVERED=
WHATSAPP_TEMPLATE_ORDER_CANCELLED=
WHATSAPP_TEMPLATE_WISH_PAYMENT_CONFIRMED=
PUBLIC_API_URL=https://api.example.com
```

The six templates correspond to the agreed guest messages. The order-received
template may use a document header for the invoice PDF. Its body receives the
customer name, order number, and total as parameters, in that order. The other
templates receive the same three body parameters.

Guests must explicitly select the WhatsApp consent checkbox during checkout.
Messages are skipped when consent is absent or integration is disabled. A
messaging failure is logged but never reverses or blocks an order.
