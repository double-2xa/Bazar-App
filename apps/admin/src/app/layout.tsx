import './globals.css';
import type { Metadata } from 'next';
import { BRAND } from '@doublea/shared';

export const metadata: Metadata = {
  title: `${BRAND.adminPanelTitle}`,
  description: `Admin dashboard for ${BRAND.shopName}`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
