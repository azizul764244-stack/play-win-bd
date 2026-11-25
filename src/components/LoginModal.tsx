import React, { useEffect, useRef, useState } from 'react';
import { Mail, ShieldCheck, X } from 'lucide-react';
import { GOOGLE_OAUTH_CLIENT_ID, isFedCmSupportedInFrame } from '../lib/firebase';
import { localizeServerText, useLanguage } from '../lib/i18n';
import { FacebookIconButton } from './FacebookButton';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onGoogleLogin: () => Promise<void>;
  onGoogleOneTapCredential: (idToken: string) => Promise<void>;
}

interface GoogleIdentityApi {
  initialize: (cfg: {
    client_id: string;
    callback: (resp: { credential?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
    itp_support?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      type?: 'standard' | 'icon';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      width?: number;
    }
  ) => void;
  prompt: () => void;
}

function getGoogleIdApi(): GoogleIdentityApi | undefined {
  const win = window as unknown as { google?: { accounts?: { id?: GoogleIdentityApi } } };
  return win.google?.accounts?.id;
}

export function LoginModal({
  open,
  onClose,
  onGoogleLogin,
  onGoogleOneTapCredential
}: LoginModalProps) {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gsiBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !GOOGLE_OAUTH_CLIENT_ID) return;
    let cancelled = false;
    let retryTimer: number | null = null;

    const fedCmAllowed = isFedCmSupportedInFrame();

    const mountGsi = (attempt = 0) => {
      if (cancelled) return;
      const gsi = getGoogleIdApi();
      if (!gsi) {
        if (attempt < 12) {
          retryTimer = window.setTimeout(() => mountGsi(attempt + 1), 250);
        }
        return;
      }
      try {
        gsi.initialize({
          client_id: GOOGLE_OAUTH_CLIENT_ID,
          callback: (resp) => {
            if (!resp.credential) return;
            setError(null);
            setLoading(true);
            void onGoogleOneTapCredential(resp.credential)
              .catch((err) => {
                const msg = err instanceof Error ? err.message : undefined;
                setError(localizeServerText(msg, lang, 'Gmail login failed.'));
              })
              .finally(() => {
                if (!cancelled) setLoading(false);
              });
          },
          auto_select: false,
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: fedCmAllowed,
          itp_support: fedCmAllowed
        });
        if (gsiBtnRef.current) {
          gsiBtnRef.current.innerHTML = '';
          gsi.renderButton(gsiBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            text: 'continue_with',
            width: 320
          });
        }
        if (fedCmAllowed) {
          gsi.prompt();
        }
      } catch {
        // fallback button remains visible
      }
    };

    mountGsi();
    return () => {
      cancelled = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [lang, onGoogleOneTapCredential, open]);

  if (!open) return null;

  const handleOneTapPopup = async () => {
    setError(null);
    setLoading(true);
    try {
      await onGoogleLogin();
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(localizeServerText(msg, lang, 'Gmail login failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl relative">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <FacebookIconButton />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Close', 'বন্ধ করুন')}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 pr-24">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
            <Mail className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {t('Login with Gmail', 'জিমেইল দিয়ে লগইন')}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t(
              '1 click = enter and play. No name, number, password, or OTP needed.',
              '১ ক্লিক = সরাসরি প্রবেশ ও খেলা শুরু। কোনো নাম, নম্বর, পাসওয়ার্ড বা ওটিপি লাগবে না।'
            )}
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center gap-2 font-semibold text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{t('Instant Auto-Connect', 'তাৎক্ষণিক অটো-কানেক্ট')}</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {t(
              'Your Gmail account connects automatically and saves all your live leaderboard points.',
              'আপনার জিমেইল অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে কানেক্ট হবে এবং লাইভ লিডারবোর্ড পয়েন্ট সংরক্ষণ করবে।'
            )}
          </p>
        </div>

        {error && (
          <div className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <div ref={gsiBtnRef} className="min-h-[44px] flex items-center justify-center" />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleOneTapPopup()}
          className="w-full min-h-[52px] px-5 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:brightness-110 disabled:opacity-50 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-95"
        >
          <Mail className="w-5 h-5" />
          <span>
            {loading
              ? t('Connecting...', 'সংযুক্ত হচ্ছে...')
              : t('Login with Gmail', 'জিমেইল দিয়ে লগইন')}
          </span>
        </button>
      </div>
    </div>
  );
}
