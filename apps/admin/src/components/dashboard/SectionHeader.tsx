import type { ReactNode } from 'react';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="dash-section-header">
      <div>
        <h2 className="dash-section-header__title">{title}</h2>
        {subtitle ? <p className="dash-section-header__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="dash-section-header__action">{action}</div> : null}
    </div>
  );
}
