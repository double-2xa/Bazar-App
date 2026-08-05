import type { ReactNode } from 'react';

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerExtra?: ReactNode;
};

export default function ChartCard({ title, subtitle, children, headerExtra }: ChartCardProps) {
  return (
    <div className="dash-chart-card">
      <div className="dash-chart-card__header">
        <div>
          <h3 className="dash-chart-card__title">{title}</h3>
          {subtitle ? <p className="dash-chart-card__subtitle">{subtitle}</p> : null}
        </div>
        {headerExtra ? <div>{headerExtra}</div> : null}
      </div>
      <div className="dash-chart-card__body">{children}</div>
    </div>
  );
}
