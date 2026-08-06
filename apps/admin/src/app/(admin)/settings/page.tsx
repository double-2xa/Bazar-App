import { BRAND, DELIVERY_FEE_FORMULA, STORE_ORIGIN, LEBANON_PLACES } from '@doublea/shared';

export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Settings</h1>
      <div className="card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginBottom: 16 }}>Store Configuration</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
          Delivery fee is calculated automatically from distance to the store (or from the Lebanon places list).
          Formula knobs are code-configured until a settings API is ready — to be finalized with the client.
        </p>
        <div className="form-group">
          <label>Store Name</label>
          <input defaultValue={BRAND.shopName} readOnly />
        </div>
        <div className="form-group">
          <label>Store Origin</label>
          <input
            defaultValue={`${STORE_ORIGIN.label} (${STORE_ORIGIN.lat}, ${STORE_ORIGIN.lng})`}
            readOnly
          />
        </div>
        <div className="form-group">
          <label>Delivery Fee Formula (TBD)</label>
          <input
            defaultValue={`mode=${DELIVERY_FEE_FORMULA.mode} · base $${DELIVERY_FEE_FORMULA.baseFee} + $${DELIVERY_FEE_FORMULA.perKm}/km · min $${DELIVERY_FEE_FORMULA.minFee} · max $${DELIVERY_FEE_FORMULA.maxFee}`}
            readOnly
          />
        </div>
        <div className="form-group">
          <label>Tax Rate (%)</label>
          <input type="number" defaultValue="8" readOnly />
        </div>
        <div className="form-group">
          <label>Covered places ({LEBANON_PLACES.length})</label>
          <textarea
            readOnly
            rows={4}
            defaultValue={LEBANON_PLACES.map((p) => p.name).join(', ')}
            style={{ width: '100%', resize: 'vertical' }}
          />
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
