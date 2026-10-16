'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import { getApiErrorMessage } from '@/utils/orderDelivery';

type TrafficData = {
  periodDays: number;
  summary: { pageViews: number; uniqueVisitors: number; sessions: number; changePercent: number | null };
  daily: Array<{ day: string; pageViews: number; visitors: number }>;
  topPages: Array<{ path: string; views: number }>;
  devices: Array<{ name: string; views: number }>;
  countries: Array<{ code: string; views: number }>;
  recent: Array<{ id: string; ipAddress: string; path: string; referrer: string | null; browser: string | null; deviceType: string | null; operatingSystem: string | null; countryCode: string | null; isBot: boolean; createdAt: string }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default function TrafficPage() {
  const [days, setDays] = useState('7');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData((await api.get<TrafficData>('/traffic/dashboard', { params: { days, page, limit: 25 } })).data); }
    catch (err) { setError(getApiErrorMessage(err, 'Could not load website traffic.')); }
    finally { setLoading(false); }
  }, [days, page]);

  useEffect(() => { void load(); }, [load]);
  const peak = useMemo(() => Math.max(1, ...(data?.daily.map((item) => item.pageViews) || [1])), [data]);

  return <div className="traffic-page">
    <div className="products-header"><div><h1>Website traffic</h1><p>First-party storefront visits, visitor activity and technical request details.</p></div><div className="traffic-period" role="group" aria-label="Traffic period">{['1', '7', '30', '90'].map((value) => <button key={value} className={days === value ? 'active' : ''} onClick={() => { setDays(value); setPage(1); }}>{value === '1' ? 'Today' : `${value} days`}</button>)}</div></div>
    {error ? <div className="alert alert-error">{error}</div> : null}
    {loading && !data ? <div className="card state-message">Loading website traffic…</div> : data ? <>
      <section className="traffic-kpis" aria-label="Traffic summary">
        <div className="card traffic-kpi"><span>Page views</span><strong>{data.summary.pageViews.toLocaleString()}</strong><small>{data.summary.changePercent === null ? 'No previous-period comparison' : `${data.summary.changePercent >= 0 ? '+' : ''}${data.summary.changePercent}% vs previous period`}</small></div>
        <div className="card traffic-kpi"><span>Unique visitors</span><strong>{data.summary.uniqueVisitors.toLocaleString()}</strong><small>Anonymous browser/IP fingerprint</small></div>
        <div className="card traffic-kpi"><span>Sessions</span><strong>{data.summary.sessions.toLocaleString()}</strong><small>Browser sessions during period</small></div>
        <div className="card traffic-kpi"><span>Views per visitor</span><strong>{data.summary.uniqueVisitors ? (data.summary.pageViews / data.summary.uniqueVisitors).toFixed(1) : '0'}</strong><small>Average storefront engagement</small></div>
      </section>
      <section className="traffic-grid">
        <div className="card traffic-chart"><div className="traffic-card-title"><div><h2>Traffic trend</h2><p>Human page views by day</p></div></div><div className="traffic-bars">{data.daily.length ? data.daily.map((item) => <div className="traffic-bar-column" key={item.day} title={`${item.pageViews} views · ${item.visitors} visitors`}><span>{item.pageViews}</span><div className="traffic-bar" style={{ height: `${Math.max(5, item.pageViews / peak * 100)}%` }} /><small>{new Date(item.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></div>) : <p className="state-message">No traffic recorded yet.</p>}</div></div>
        <div className="card traffic-breakdown"><h2>Top pages</h2>{data.topPages.length ? data.topPages.map((item) => <div className="traffic-ranked" key={item.path}><span title={item.path}>{item.path}</span><strong>{item.views}</strong></div>) : <p className="state-message">No page data yet.</p>}</div>
        <div className="card traffic-breakdown"><h2>Devices</h2>{data.devices.map((item) => <div className="traffic-ranked" key={item.name}><span>{item.name}</span><strong>{item.views}</strong></div>)}<h2 className="traffic-subtitle">Countries</h2>{data.countries.map((item) => <div className="traffic-ranked" key={item.code}><span>{item.code}</span><strong>{item.views}</strong></div>)}</div>
      </section>
      <section className="card products-table-card traffic-visits"><div className="traffic-table-header"><div><h2>Recent visits</h2><p>IP addresses are personal data—use them only for security and operations.</p></div><button className="btn btn-outline" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div><table className="table"><thead><tr><th>Time</th><th>IP address</th><th>Page</th><th>Browser</th><th>Device</th><th>Country</th><th>Source</th></tr></thead><tbody>{data.recent.length ? data.recent.map((visit) => <tr key={visit.id}><td>{new Date(visit.createdAt).toLocaleString()}</td><td><code>{visit.ipAddress}</code>{visit.isBot ? <span className="badge badge-muted">Bot</span> : null}</td><td>{visit.path}</td><td>{visit.browser || 'Unknown'}<span className="import-cell-secondary">{visit.operatingSystem || 'Unknown OS'}</span></td><td>{visit.deviceType || 'Unknown'}</td><td>{visit.countryCode || '—'}</td><td>{visit.referrer || 'Direct'}</td></tr>) : <tr><td colSpan={7}>No visits recorded yet.</td></tr>}</tbody></table></section>
      <div className="import-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {data.pagination.totalPages}</span><button disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div>
    </> : null}
  </div>;
}
