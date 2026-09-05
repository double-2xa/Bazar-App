import PDFDocument = require('pdfkit');

type InvoiceItem = {
  productName?: string;
  quantity?: number;
  preparedQuantity?: number;
  unavailableQuantity?: number;
  unitPrice?: number;
  totalPrice?: number;
};

type InvoiceOrder = {
  orderNumber?: string;
  createdAt?: string | Date;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  subtotal?: number;
  deliveryFee?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  user?: { fullName?: string; email?: string; phone?: string | null };
  address?: {
    fullName?: string;
    street?: string;
    building?: string | null;
    city?: string;
    district?: string | null;
    governorate?: string | null;
    country?: string;
    phone?: string;
  };
  items?: InvoiceItem[];
};

const BRAND = '#8b1e2d';
const GOLD = '#f3c623';
const TEXT = '#202124';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';

const money = (value?: number) => `$${Number(value ?? 0).toFixed(2)}`;
const label = (value?: string) => (value || '-').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function writeSummaryRow(doc: PDFKit.PDFDocument, name: string, value: string, strong = false) {
  const y = doc.y;
  doc.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(strong ? 12 : 10).fillColor(strong ? TEXT : MUTED);
  doc.text(name, 350, y, { width: 100 });
  doc.fillColor(TEXT).text(value, 450, y, { width: 90, align: 'right' });
  doc.y = y + (strong ? 23 : 18);
}

function addFooter(doc: PDFKit.PDFDocument, pageNumber: number, pageCount: number) {
  const bottom = doc.page.height - 66;
  doc.moveTo(54, bottom - 10).lineTo(541, bottom - 10).strokeColor(BORDER).lineWidth(0.7).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    .text('Nice Price Bazar - Thank you for your order', 54, bottom, { width: 350, lineBreak: false })
    .text(`Page ${pageNumber} of ${pageCount}`, 440, bottom, { width: 100, align: 'right', lineBreak: false });
}

function addItemsHeader(doc: PDFKit.PDFDocument, y: number) {
  doc.roundedRect(54, y, 487, 27, 5).fill('#f5f5f6');
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);
  doc.text('ITEM', 64, y + 9, { width: 240 });
  doc.text('QTY', 325, y + 9, { width: 45, align: 'center' });
  doc.text('UNIT PRICE', 380, y + 9, { width: 70, align: 'right' });
  doc.text('TOTAL', 465, y + 9, { width: 66, align: 'right' });
  doc.y = y + 35;
}

export function createInvoicePdf(order: InvoiceOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 54, bufferPages: true, info: {
      Title: `Invoice ${order.orderNumber ?? ''}`,
      Author: 'Nice Price Bazar',
      Subject: 'Order invoice',
    } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, doc.page.width, 12).fill(BRAND);
    doc.roundedRect(54, 48, 42, 42, 10).fill(GOLD);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(BRAND).text('NP', 54, 62, { width: 42, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(19).fillColor(TEXT).text('Nice Price Bazar', 108, 52);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Order invoice', 108, 77);

    doc.font('Helvetica-Bold').fontSize(28).fillColor(BRAND).text('INVOICE', 350, 48, { width: 191, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text(`Invoice: INV-${order.orderNumber ?? '-'}`, 350, 80, { width: 191, align: 'right' })
      .text(`Issued: ${new Date(order.createdAt ?? Date.now()).toLocaleDateString('en-GB')}`, 350, 94, { width: 191, align: 'right' });

    doc.y = 137;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND).text('BILLED TO', 54, doc.y);
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT).text(order.user?.fullName || order.address?.fullName || 'Customer');
    doc.font('Helvetica').fontSize(9).fillColor(MUTED);
    if (order.user?.email) doc.text(order.user.email);
    if (order.user?.phone) doc.text(order.user.phone);

    const addressLines = [
      [order.address?.street, order.address?.building].filter(Boolean).join(', '),
      [order.address?.city, order.address?.district, order.address?.governorate].filter(Boolean).join(', '),
      order.address?.country,
    ].filter(Boolean);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND).text('DELIVER TO', 310, 137);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(addressLines.join('\n') || 'No delivery address', 310, 154, { width: 231 });

    const infoY = Math.max(doc.y + 18, 220);
    doc.roundedRect(54, infoY, 487, 52, 8).fill('#faf7f7');
    const meta = [
      ['ORDER', order.orderNumber || '-'],
      ['STATUS', label(order.status)],
      ['PAYMENT', `${label(order.paymentMethod)} - ${label(order.paymentStatus)}`],
    ];
    meta.forEach(([name, value], index) => {
      const x = 68 + index * 158;
      doc.font('Helvetica-Bold').fontSize(7).fillColor(MUTED).text(name, x, infoY + 11, { width: 145 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT).text(value, x, infoY + 27, { width: 145 });
    });

    let tableY = infoY + 78;
    addItemsHeader(doc, tableY);
    for (const item of order.items ?? []) {
      if (doc.y > 700) {
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 8).fill(BRAND);
        addItemsHeader(doc, 54);
      }
      const y = doc.y;
      const unavailable = item.unavailableQuantity ?? 0;
      const available = Math.max(0, (item.quantity ?? 0) - unavailable);
      const productName = item.productName || 'Product';
      doc.font('Helvetica').fontSize(9).fillColor(TEXT).text(productName, 64, y, { width: 240 });
      const rowHeight = Math.max(unavailable > 0 ? 32 : 22, doc.heightOfString(productName, { width: 240 }) + (unavailable > 0 ? 20 : 10));
      doc.text(unavailable > 0 ? `${available}/${item.quantity ?? 0}` : String(item.quantity ?? 0), 325, y, { width: 45, align: 'center' });
      doc.text(money(item.unitPrice), 380, y, { width: 70, align: 'right' });
      doc.font('Helvetica-Bold').text(money(item.totalPrice), 465, y, { width: 66, align: 'right' });
      if (unavailable > 0) {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(BRAND)
          .text(`${unavailable} unavailable — not charged`, 64, y + 12, { width: 240 });
      }
      doc.moveTo(64, y + rowHeight - 3).lineTo(531, y + rowHeight - 3).strokeColor(BORDER).lineWidth(0.5).stroke();
      doc.y = y + rowHeight;
    }

    doc.y += 13;
    if (doc.y > 650) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 8).fill(BRAND);
      doc.y = 60;
    }
    writeSummaryRow(doc, 'Subtotal', money(order.subtotal));
    writeSummaryRow(doc, 'Delivery', money(order.deliveryFee));
    if (Number(order.discountAmount ?? 0) > 0) writeSummaryRow(doc, 'Discount', `-${money(order.discountAmount)}`);
    writeSummaryRow(doc, 'Tax', money(order.taxAmount));
    doc.moveTo(350, doc.y + 2).lineTo(541, doc.y + 2).strokeColor(BRAND).lineWidth(1).stroke();
    doc.y += 12;
    writeSummaryRow(doc, 'TOTAL', money(order.totalAmount), true);

    doc.moveDown(1.4);
    const noteY = doc.y;
    doc.roundedRect(54, noteY, 270, 54, 8).fill('#faf7f7');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND).text('PAYMENT NOTE', 68, noteY + 12);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(
      order.paymentStatus === 'paid' ? 'This invoice has been paid.' : 'Payment is due according to the selected payment method.',
      68,
      noteY + 29,
      { width: 242 },
    );

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i += 1) {
      doc.switchToPage(i);
      addFooter(doc, i + 1, pages.count);
    }
    doc.end();
  });
}
