'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRAND } from '@doublea/shared';
import api from '@/services/api';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.user.role !== 'admin') {
        setError('Admin access only');
        return;
      }
      localStorage.setItem('adminToken', data.tokens.accessToken);
      localStorage.setItem('adminRefreshToken', data.tokens.refreshToken);
      router.push('/dashboard');
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(900px 500px at 20% 10%, rgba(255,210,30,0.22), transparent 55%), linear-gradient(160deg, #7A1020 0%, #4A0A14 100%)',
        padding: 24,
      }}
    >
      <div className="card" style={{ width: 400, padding: 32, boxShadow: 'var(--shadow-md)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: 'var(--brand-yellow)',
              borderRadius: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 18,
              color: 'var(--deep-red)',
              marginBottom: 12,
              letterSpacing: '-0.03em',
              boxShadow: '0 1px 0 rgba(255,255,255,0.35) inset, 0 8px 20px rgba(0,0,0,0.18)',
            }}
          >
            NP
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {BRAND.adminPanelTitle}
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 4 }}>Manage {BRAND.shopName}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14 }}>{error}</p>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        {process.env.NODE_ENV !== 'production' && (
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
            Demo: admin@doublea.com / Admin123!
          </p>
        )}
      </div>
    </div>
  );
}
