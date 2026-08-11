'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BRAND } from '@doublea/shared';
import { formatTodayLabel } from '@/utils/format';

type NavSection = {
  label: string;
  items: { href: string; label: string; icon: NavIconName }[];
};

type NavIconName = 'dashboard' | 'orders' | 'wish' | 'delivery' | 'products' | 'categories' | 'users' | 'companies' | 'coupons' | 'reviews' | 'settings';

const ICON_PATHS: Record<NavIconName, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  orders: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
  wish: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M8 14h3" /></>,
  delivery: <><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  products: <><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z" /><path d="m4 7 8 4 8-4M12 11v10" /></>,
  categories: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><path d="M17.5 14v7M14 17.5h7" /></>,
  users: <><circle cx="9" cy="8" r="4" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4.5a4 4 0 0 1 0 7M18 15a5 5 0 0 1 3 4.6V21" /></>,
  companies: <><path d="M4 21V5l8-3v19M12 8h8v13M8 7v1M8 11v1M8 15v1M16 12v1M16 16v1M2 21h20" /></>,
  coupons: <><path d="M3 9a3 3 0 0 0 0 6v4h18v-4a3 3 0 0 0 0-6V5H3v4Z" /><path d="M13 5v14" /></>,
  reviews: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
};

function NavIcon({ name }: { name: NavIconName }) {
  return <svg className="admin-nav-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICON_PATHS[name]}</svg>;
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/orders', label: 'Orders', icon: 'orders' },
      { href: '/wish-payments', label: 'Wish Money', icon: 'wish' },
      { href: '/delivery-agents', label: 'Delivery Agents', icon: 'delivery' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/products', label: 'Products', icon: 'products' },
      { href: '/categories', label: 'Categories', icon: 'categories' },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { href: '/users', label: 'Users', icon: 'users' },
      { href: '/companies', label: 'Companies', icon: 'companies' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/coupons', label: 'Coupons', icon: 'coupons' },
      { href: '/reviews', label: 'Reviews', icon: 'reviews' },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/settings', label: 'Settings', icon: 'settings' }],
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
                  aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
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
            <span className="admin-topbar__badge"><span className="admin-topbar__status-dot" />Operations</span>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
