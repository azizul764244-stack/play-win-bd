import React, { useEffect, useState } from 'react';
import { Lock, Phone, Shield } from 'lucide-react';
import { getAdminAuthStatus, loginAdminWithPassword, setupAdminCredentials } from '../lib/api';
import { localizeServerText, useLanguage } from '../lib/i18n';
import { FacebookIconButton } from './FacebookButton';

interface AdminLoginGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdminLoginGate({ onSuccess, onCancel }: AdminLoginGateProps) {
  const { lang, t } = useLanguage();
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminAuthStatus()
      .then((res) => setSetupRequired(res.setupRequired))
      .catch(() => setSetupRequired(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (setupRequired && password !== confirmPassword) {
      setError(t('Passwords do not match.', 'পাসওয়ার্ড দুটি মেলেনি।'));
      return;
    }

    setSubmitting(true);
    try {
      if (setupRequired) {
        await setupAdminCredentials(phone.trim(), password);
      } else {
        await loginAdminWithPassword(phone.trim(), password);
      }
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(localizeServerText(msg, lang, 'Admin login failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (setupRequired === null) {
    return (
      <section className="max-w-md mx-auto px-4 py-16 text-center text-sm text-slate-400">
        {t('Checking...', 'যাচাই করা হচ্ছে...')}
      </section>
    );
  }

  return (
    <section className="max-w-md mx-auto px-4 py-12">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl relative">
        <div className="absolute top-4 right-4">
          <FacebookIconButton />
        </div>
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {setupRequired
              ? t('First-Time Admin Setup', 'প্রথমবার অ্যাডমিন সেটআপ')
              : t('Admin Login', 'অ্যাডমিন লগইন')}
          </h2>
          <p className="text-xs text-slate-400">
            {setupRequired
              ? t(
                  'Set your mobile number and password to protect the admin panel.',
                  'অ্যাডমিন প্যানেল সুরক্ষিত রাখতে আপনার মোবাইল নম্বর ও পাসওয়ার্ড সেট করুন।'
                )
              : t(
                  'Enter your admin mobile number and password to continue.',
                  'প্রবেশ করতে আপনার অ্যাডমিন মোবাইল নম্বর ও পাসওয়ার্ড দিন।'
                )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {t('Admin Mobile Number', 'অ্যাডমিন মোবাইল নম্বর')}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                pattern={setupRequired ? '01[3-9][0-9]{8}' : undefined}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full min-h-[46px] pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-tabular text-white outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {t('Password', 'পাসওয়ার্ড')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('Minimum 6 characters', 'কমপক্ষে ৬ অক্ষর')}
                className="w-full min-h-[46px] pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {setupRequired && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {t('Confirm Password', 'পাসওয়ার্ড নিশ্চিত করুন')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('Re-enter password', 'পুনরায় পাসওয়ার্ড দিন')}
                  className="w-full min-h-[46px] pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition-colors"
          >
            {submitting
              ? t('Verifying...', 'যাচাই হচ্ছে...')
              : setupRequired
              ? t('Set Admin Password', 'অ্যাডমিন পাসওয়ার্ড সেট করুন')
              : t('Login to Admin Panel', 'অ্যাডমিন লগইন করুন')}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[42px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            {t('Back to Home', 'হোম পেজে ফিরে যান')}
          </button>
        </form>
      </div>
    </section>
  );
}
