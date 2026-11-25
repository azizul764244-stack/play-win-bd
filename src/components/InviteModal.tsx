import React, { useState } from 'react';
import { Check, Copy, Gift, MessageCircle, Share2, Users, X } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  referralCode?: string;
  isSignedIn: boolean;
  onRequestLogin: () => void;
}

export function InviteModal({
  open,
  onClose,
  referralCode,
  isSignedIn,
  onRequestLogin
}: InviteModalProps) {
  const { t } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  if (!open) return null;

  const code = referralCode || '';
  const shareText = `Play & Win BD - Free te khelo, mashe taka jito! Amar code: ${code}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = code ? `${origin}/?ref=${encodeURIComponent(code)}` : origin;
  const fullShareMessage = `${shareText}\n${shareUrl}`;

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(fullShareMessage)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
  const messengerHref = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=966242223397117&redirect_uri=${encodeURIComponent(shareUrl)}`;

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCopyMessage = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(fullShareMessage);
      setCopiedMsg(true);
      window.setTimeout(() => setCopiedMsg(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleNativeShare = async () => {
    if (!code || typeof navigator.share !== 'function') return;
    try {
      await navigator.share({
        title: 'PLAY & WIN BD',
        text: shareText,
        url: shareUrl
      });
    } catch {
      // user cancelled or share unsupported
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('Close', 'বন্ধ করুন')}
          className="absolute top-4 right-4 w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2 pr-10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {t('Invite Friends & Earn Points', 'বন্ধুদের ইনভাইট করুন ও পয়েন্ট জিতুন')}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t(
              'Share your unique referral code. When a friend signs up for the first time with your code, you get +50 points and they get +30 points!',
              'আপনার ইউনিক রেফার কোড শেয়ার করুন। আপনার কোড দিয়ে কোনো বন্ধু প্রথমবার সাইনআপ করলে আপনি পাবেন +৫০ পয়েন্ট এবং আপনার বন্ধু পাবে +৩০ পয়েন্ট!'
            )}
          </p>
        </div>

        {!isSignedIn || !code ? (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center space-y-3">
            <Gift className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-sm text-slate-300">
              {t(
                'Sign in with your Gmail account to get your personal referral code and invite friends.',
                'আপনার ব্যক্তিগত রেফার কোড পেতে এবং বন্ধুদের ইনভাইট করতে জিমেইল দিয়ে লগইন করুন।'
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestLogin();
              }}
              className="w-full min-h-[46px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm"
            >
              {t('Sign in with Gmail', 'জিমেইল দিয়ে লগইন করুন')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Referral Code Box */}
            <div className="bg-slate-950 border border-emerald-500/35 rounded-2xl p-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400">
                {t('Your Unique Referral Code', 'আপনার ইউনিক রেফার কোড')}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono-tabular text-2xl font-extrabold tracking-wider text-emerald-400 select-all">
                  {code}
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyCode()}
                  className="min-h-[40px] px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? t('Copied!', 'কপি হয়েছে!') : t('Copy Code', 'কোড কপি করুন')}</span>
                </button>
              </div>
            </div>

            {/* Exact Share Message Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-400">
                  {t('Invite Message', 'ইনভাইট মেসেজ')}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyMessage()}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  {copiedMsg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMsg ? t('Copied!', 'কপি হয়েছে!') : t('Copy Text', 'মেসেজ কপি করুন')}</span>
                </button>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed break-words">{shareText}</p>
            </div>

            {/* Share Buttons */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                {t('Share via', 'শেয়ার করুন')}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/45 text-[#4ade80] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={facebookHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3 rounded-xl bg-[#1877F2]/20 hover:bg-[#1877F2]/30 border border-[#1877F2]/45 text-[#60a5fa] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span>Facebook</span>
                </a>
                <a
                  href={messengerHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3 rounded-xl bg-[#0084FF]/20 hover:bg-[#0084FF]/30 border border-[#0084FF]/45 text-[#38bdf8] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Messenger</span>
                </a>
              </div>

              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  className="w-full min-h-[42px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{t('More Share Options', 'অন্যান্য মাধ্যমে শেয়ার করুন')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
