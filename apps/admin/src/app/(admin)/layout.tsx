'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BRAND } from '@doublea/shared';
import { formatTodayLabel } from '@/utils/format';

type NavSection = {
  label: string;
  items: { href: string; label: string }[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/orders', label: 'Orders' },
      { href: '/delivery-agents', label: 'Delivery Agents' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/products', label: 'Products' },
      { href: '/categories', label: 'Categories' },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { href: '/users', label: 'Users' },
      { href: '/companies', label: 'Companies' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/coupons', label: 'Coupons' },
      { href: '/reviews', label: 'Reviews' },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/settings', label: 'Settings' }],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token && pathname !== '/login') router.replace('/login');
  }, [pathname, router]);

  if (pathname === '/login') return <>{children}</>;

  const handleSignOut = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    router.push('/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__mark" aria-hidden>
            NP
          </div>
          <div>
            <div className="admin-sidebar__shop">{BRAND.shopName}</div>
            <div className="admin-sidebar__role">Admin</div>
          </div>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Admin navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="admin-nav-section">
              <div className="admin-nav-section__label">{section.label}</div>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-link${isActivePath(pathname, item.href) ? ' admin-nav-link--active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <button type="button" className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="admin-topbar__title">{BRAND.adminPanelTitle}</div>
            <div className="admin-topbar__date">{formatTodayLabel()} · Lebanon</div>
          </div>
          <div className="admin-topbar__meta">
            <span className="admin-topbar__badge">Operations</span>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
