import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DoubleA Commerce - Admin',
  description: 'Admin dashboard for DoubleA Commerce',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
