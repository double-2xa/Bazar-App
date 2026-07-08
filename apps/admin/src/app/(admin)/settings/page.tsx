export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Settings</h1>
      <div className="card" style={{ maxWidth: 600 }}>
        <h3 style={{ marginBottom: 16 }}>Store Configuration</h3>
        <div className="form-group">
          <label>Store Name</label>
          <input defaultValue="DoubleA Commerce" />
        </div>
        <div className="form-group">
          <label>Default Delivery Fee</label>
          <input type="number" defaultValue="5.99" step="0.01" />
        </div>
        <div className="form-group">
          <label>Tax Rate (%)</label>
          <input type="number" defaultValue="8" />
        </div>
        <div className="form-group">
          <label>Support Email</label>
          <input defaultValue="support@doublea.com" />
        </div>
        <button className="btn btn-primary">Save Settings</button>
      </div>
    </div>
  );
}
