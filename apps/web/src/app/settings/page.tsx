'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell, ErrorBox, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { getStoredUser, saveAuth, getStoredToken, type AuthUser } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/labels';
import { adminNav, candidateNav, employerNav } from '@/lib/nav';

function settingsNav(role?: string) {
  if (role === 'EMPLOYER') return employerNav;
  if (role === 'ADMIN') return adminNav;
  return candidateNav;
}

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const me = await api('/auth/me');
      setUser(me);
      setFirstName(me.firstName || '');
      setLastName(me.lastName || '');
      const token = getStoredToken();
      if (token) saveAuth(token, me);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить настройки');
      setUser(getStoredUser());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setToast('');
    try {
      const updated = await api('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ firstName, lastName }),
      });
      setUser(updated);
      const token = getStoredToken();
      if (token) saveAuth(token, updated);
      setToast('Профиль обновлён');
    } catch (err: any) {
      setToast(err.message || 'Не удалось сохранить профиль');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setToast('');
    if (newPassword !== confirmPassword) {
      setToast('Новый пароль и подтверждение не совпадают');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setToast(res.message || 'Пароль успешно изменён');
    } catch (err: any) {
      setToast(err.message || 'Не удалось сменить пароль');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <AppShell title="Настройки" nav={settingsNav(user?.role)}>
      {loading && <Spinner label="Загрузка настроек" />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {toast && <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{toast}</p>}

      {!loading && user && (
        <div className="mx-auto max-w-xl space-y-6">
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold">Учётная запись</h2>
            <p className="text-sm text-ink-600">
              Email: <span className="font-medium text-ink-900">{user.email}</span>
            </p>
            <p className="text-sm text-ink-600">
              Роль: <span className="font-medium text-ink-900">{ROLE_LABEL[user.role] || user.role}</span>
            </p>
          </section>

          <form onSubmit={saveProfile} className="card space-y-3">
            <h2 className="text-lg font-semibold">Личные данные</h2>
            <div>
              <label className="label">Имя</label>
              <input className="field" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Фамилия</label>
              <input className="field" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>

          <form onSubmit={savePassword} className="card space-y-3">
            <h2 className="text-lg font-semibold">Смена пароля</h2>
            <div>
              <label className="label">Текущий пароль</label>
              <input
                type="password"
                className="field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="label">Новый пароль</label>
              <input
                type="password"
                className="field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Подтверждение нового пароля</label>
              <input
                type="password"
                className="field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={savingPassword}>
              {savingPassword ? 'Сохранение…' : 'Сменить пароль'}
            </button>
          </form>
        </div>
      )}
    </AppShell>
  );
}
