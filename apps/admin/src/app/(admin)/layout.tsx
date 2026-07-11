'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BRAND } from '@doublea/shared';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/products', label: 'Products', icon: '📦' },
  { href: '/categories', label: 'Categories', icon: '🏷️' },
  { href: '/orders', label: 'Orders', icon: '🛒' },
  { href: '/users', label: 'Users', icon: '👥' },
  { href: '/companies', label: 'Companies', icon: '🏢' },
  { href: '/delivery-agents', label: 'Delivery Agents', icon: '🚚' },
  { href: '/coupons', label: 'Coupons', icon: '🎟️' },
  { href: '/reviews', label: 'Reviews', icon: '⭐' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token && pathname !== '/login') router.replace('/login');
  }, [pathname, router]);

  if (pathname === '/login') return <>{children}</>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 260, background: 'var(--sidebar-bg)', color: 'var(--sidebar-text)', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--brand-yellow)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--deep-red)', fontSize: 13 }}>NP</div>
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>{BRAND.shopName}</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Admin Panel</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: '16px 12px' }}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 4,
                fontSize: 14,
                fontWeight: pathname === item.href ? 600 : 400,
                background: pathname === item.href ? 'rgba(255, 210, 30, 0.18)' : 'transparent',
                color: pathname === item.href ? 'var(--brand-yellow)' : 'var(--sidebar-text)',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', marginTop: 'auto' }}>
          <button
            className="btn btn-outline"
            style={{ width: '100%', fontSize: 13 }}
            onClick={() => {
              localStorage.removeItem('adminToken');
              router.push('/login');
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
