import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export default function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="admin-page-header">
      <div>
        <h1 className="admin-page-title">{title}</h1>
        {subtitle ? <p className="admin-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="admin-page-actions">{actions}</div> : null}
    </div>
  );
}
