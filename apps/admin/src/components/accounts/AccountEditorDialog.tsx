'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import { getApiErrorMessage } from '@/utils/orderDelivery';

export type AccountRole = 'normal_user' | 'company' | 'admin' | 'delivery_agent';

export type AccountRecord = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: AccountRole;
  isActive: boolean;
  companyProfile?: {
    companyName: string;
    vatNumber: string;
    businessAddress: string;
    contactPerson: string;
    companyPhone: string;
  } | null;
};

type Props = {
  account?: AccountRecord | null;
  fixedRole?: AccountRole;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const ROLES: { value: AccountRole; label: string }[] = [
  { value: 'normal_user', label: 'Normal user' },
  { value: 'company', label: 'Company' },
  { value: 'delivery_agent', label: 'Delivery agent' },
  { value: 'admin', label: 'Administrator' },
];

export default function AccountEditorDialog({ account, fixedRole, onClose, onSaved }: Props) {
  const editing = Boolean(account);
  const [form, setForm] = useState({
    fullName: account?.fullName ?? '',
    email: account?.email ?? '',
    phone: account?.phone ?? '',
    password: '',
    role: fixedRole ?? account?.role ?? ('normal_user' as AccountRole),
    isActive: account?.isActive ?? true,
    companyName: account?.companyProfile?.companyName ?? '',
    vatNumber: account?.companyProfile?.vatNumber ?? '',
    businessAddress: account?.companyProfile?.businessAddress ?? '',
    contactPerson: account?.companyProfile?.contactPerson ?? '',
    companyPhone: account?.companyProfile?.companyPhone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && !saving && onClose();
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', escape);
    };
  }, [onClose, saving]);

  const set = (field: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password || undefined,
      };
      if (editing && account) await api.patch(`/admin/users/${account.id}`, payload);
      else await api.post('/admin/users', payload);
      await onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, `Failed to ${editing ? 'update' : 'create'} account.`));
    } finally {
      setSaving(false);
    }
  };

  const isCompany = form.role === 'company';

  return (
    <div className="modal-overlay account-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <div className="modal account-modal" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <div className="account-modal__header">
          <div>
            <h2 id="account-dialog-title">{editing ? 'Edit account' : fixedRole === 'company' ? 'Create company account' : 'Create account'}</h2>
            <p>{isCompany ? 'Company accounts created here are approved immediately.' : 'Set sign-in details and the account role.'}</p>
          </div>
          <button type="button" className="account-modal__close" aria-label="Close" disabled={saving} onClick={onClose}>×</button>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <form onSubmit={submit}>
          <div className="account-form-grid">
            <div className="form-group"><label htmlFor="account-name">Full name</label><input id="account-name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} minLength={2} required autoFocus /></div>
            <div className="form-group"><label htmlFor="account-email">Email</label><input id="account-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required /></div>
            <div className="form-group"><label htmlFor="account-phone">Phone <span className="field-optional">Optional</span></label><input id="account-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div className="form-group"><label htmlFor="account-password">Password {editing ? <span className="field-optional">Leave blank to keep</span> : null}</label><input id="account-password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} minLength={6} required={!editing} autoComplete="new-password" /></div>
            <div className="form-group account-role-field"><label htmlFor="account-role">Role</label><select id="account-role" value={form.role} disabled={Boolean(fixedRole)} onChange={(e) => set('role', e.target.value)}>{ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div>
          </div>

          {isCompany ? (
            <fieldset className="account-company-fields">
              <legend>Company details</legend>
              <div className="account-form-grid">
                <div className="form-group"><label htmlFor="company-name">Company name</label><input id="company-name" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} required /></div>
                <div className="form-group"><label htmlFor="company-vat">VAT number</label><input id="company-vat" value={form.vatNumber} onChange={(e) => set('vatNumber', e.target.value)} required /></div>
                <div className="form-group account-field-wide"><label htmlFor="company-address">Business address</label><input id="company-address" value={form.businessAddress} onChange={(e) => set('businessAddress', e.target.value)} required /></div>
                <div className="form-group"><label htmlFor="company-contact">Contact person</label><input id="company-contact" value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} required /></div>
                <div className="form-group"><label htmlFor="company-phone">Company phone</label><input id="company-phone" value={form.companyPhone} onChange={(e) => set('companyPhone', e.target.value)} required /></div>
              </div>
            </fieldset>
          ) : null}

          {editing ? <label className="account-status-control"><span><strong>Account active</strong><small>Inactive accounts cannot sign in.</small></span><input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /></label> : null}

          <div className="account-modal__actions"><button type="button" className="btn btn-outline" disabled={saving} onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create account'}</button></div>
        </form>
      </div>
    </div>
  );
}
