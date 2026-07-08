'use client';

import { useState } from 'react';
import api from '@/services/api';

export default function DeliveryAgentsPage() {
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [message, setMessage] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/delivery-agents', form);
      setMessage('Delivery agent created successfully');
      setForm({ email: '', password: '', fullName: '', phone: '' });
    } catch {
      setMessage('Failed to create agent');
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Delivery Agents</h1>
      <div className="card" style={{ maxWidth: 500 }}>
        <h3 style={{ marginBottom: 16 }}>Create Delivery Agent</h3>
        <form onSubmit={handleCreate}>
          {(['fullName', 'email', 'phone', 'password'] as const).map((f) => (
            <div key={f} className="form-group">
              <label>{f === 'fullName' ? 'Full Name' : f.charAt(0).toUpperCase() + f.slice(1)}</label>
              <input type={f === 'password' ? 'password' : f === 'email' ? 'email' : 'text'} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} required={f !== 'phone'} />
            </div>
          ))}
          <button type="submit" className="btn btn-primary">Create Agent</button>
          {message && <p style={{ marginTop: 12, color: 'var(--success)' }}>{message}</p>}
        </form>
      </div>
    </div>
  );
}
