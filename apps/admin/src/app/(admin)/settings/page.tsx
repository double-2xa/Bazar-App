import { BRAND } from '@doublea/shared';

export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Settings</h1>
      <div className="card" style={{ maxWidth: 600 }}>
        <h3 style={{ marginBottom: 16 }}>Store Configuration</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
          Store settings are read-only until a backend settings API is implemented.
        </p>
        <div className="form-group">
          <label>Store Name</label>
          <input defaultValue={BRAND.shopName} readOnly />
        </div>
        <div className="form-group">
          <label>Default Delivery Fee</label>
          <input type="number" defaultValue="5.99" step="0.01" readOnly />
        </div>
        <div className="form-group">
          <label>Tax Rate (%)</label>
          <input type="number" defaultValue="8" readOnly />
        </div>
        <div className="form-group">
          <label>Support Email</label>
          <input defaultValue="support@nicepricebazar.com" readOnly />
        </div>
        <button className="btn btn-primary" disabled title="Requires backend settings API">
          Save Settings (coming soon)
        </button>
      </div>
    </div>
  );
}
