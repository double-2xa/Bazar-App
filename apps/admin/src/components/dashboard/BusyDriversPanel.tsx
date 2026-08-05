import Link from 'next/link';
import type { DashboardBusyAgent } from '@doublea/shared';
import EmptyState from '@/components/EmptyState';
import SectionHeader from './SectionHeader';

type BusyDriversPanelProps = {
  drivers: DashboardBusyAgent[];
};

export default function BusyDriversPanel({ drivers }: BusyDriversPanelProps) {
  return (
    <div className="dash-panel">
      <SectionHeader
        title="Busy drivers"
        subtitle="Active delivery load"
        action={
          <Link href="/delivery-agents" className="dash-panel__link">
            Manage drivers
          </Link>
        }
      />
      {drivers.length === 0 ? (
        <EmptyState message="No active delivery agents." />
      ) : (
        <ul className="dash-list">
          {drivers.map((d) => (
            <li key={d.id} className="dash-list__item">
              <div>
                <div className="dash-list__primary">{d.fullName}</div>
                <div className="dash-list__secondary">{d.phone ?? 'No phone'}</div>
              </div>
              <span className={`dash-list__badge${d.activeOrderCount > 0 ? ' dash-list__badge--active' : ''}`}>
                {d.activeOrderCount} active
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
