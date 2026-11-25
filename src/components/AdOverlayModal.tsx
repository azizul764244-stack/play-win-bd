import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Play, Sparkles } from 'lucide-react';
import { tryExternalAdBreak } from '../lib/adManager';
import { useLanguage } from '../lib/i18n';

export type AdOverlayKind = 'gameover-adsense' | 'game-entry' | 'leaderboard-exit' | 'revive' | 'double-coin';

interface AdOverlayModalProps {
  open: boolean;
  kind: AdOverlayKind | null;
  placementLabel?: string;
  onComplete: () => void;
  onSkipOrDismiss?: () => void;
  onLoadFailed?: () => void;
}

const GOOGLE_ADSENSE_CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT_ID || '').trim();
const GOOGLE_ADSENSE_SLOT = (import.meta.env.VITE_ADSENSE_SLOT_ID || '').trim();

export function AdOverlayModal({
  open,
  kind,
  onComplete,
  onSkipOrDismiss,
  onLoadFailed
}: AdOverlayModalProps) {
  const { t } = useLanguage();
  const totalSeconds = 10;

  const [phase, setPhase] = useState<'loading' | 'playing' | 'ready'>('loading');
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const adContainerRef = useRef<HTMLDivElement | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onSkipRef = useRef(onSkipOrDismiss);
  onSkipRef.current = onSkipOrDismiss;
  const onFailRef = useRef(onLoadFailed);
  onFailRef.current = onLoadFailed;

  useEffect(() => {
    if (!open || !kind) return;
    let cancelled = false;
    setPhase('loading');
    setSecondsLeft(totalSeconds);

    const startAd = async () => {
      try {
        if (GOOGLE_ADSENSE_CLIENT) {
          const external = await tryExternalAdBreak('interstitial', kind);
          if (cancelled) return;
          if (external.handledByExternalSdk && external.shownOrRewarded) {
            onCompleteRef.current();
            return;
          }
        }
      } catch {
        // Fallback smoothly to in-app 10-second AdSense container
      }

      if (cancelled) return;
      window.setTimeout(() => {
        if (!cancelled) {
          setPhase('playing');
          try {
            const win = window as unknown as { adsbygoogle?: unknown[] };
            if (GOOGLE_ADSENSE_CLIENT && Array.isArray(win.adsbygoogle)) {
              win.adsbygoogle.push({});
            }
          } catch {
            // fail open smoothly
          }
        }
      }, 250);
    };

    void startAd();

    return () => {
      cancelled = true;
    };
  }, [kind, open]);

  useEffect(() => {
    if (!open || phase !== 'playing') return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setPhase('ready');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, phase]);

  if (!open || !kind) return null;

  const progressPct =
    phase === 'loading'
      ? 5
      : phase === 'ready'
      ? 100
      : Math.min(100, Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100));

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-md w-full rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-white/15 shadow-2xl overflow-hidden">
        {/* Top Ad Bar */}
        <div className="px-4 py-3 bg-slate-950/85 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-amber-300 uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('Google AdSense Ad · 10s', 'গুগল অ্যাডসেন্স বিজ্ঞাপন · ১০ সেকেন্ড')}</span>
          </div>

          {phase === 'ready' ? (
            <button
              type="button"
              onClick={onComplete}
              className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('Play Again', 'আবার খেলুন')}</span>
            </button>
          ) : (
            <span className="font-mono-tabular text-xs font-extrabold text-amber-300 px-3 py-1 rounded-full bg-slate-800 border border-amber-400/30">
              {phase === 'loading' ? '10s' : `${secondsLeft}s`}
            </span>
          )}
        </div>

        {/* Google AdSense Ad Slot + 10-Second Display */}
        <div className="p-6 text-center space-y-5">
          <div
            ref={adContainerRef}
            className="min-h-[180px] rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center p-4 gap-3 overflow-hidden"
          >
            {GOOGLE_ADSENSE_CLIENT && GOOGLE_ADSENSE_SLOT ? (
              <ins
                className="adsbygoogle block w-full min-h-[160px]"
                data-ad-client={GOOGLE_ADSENSE_CLIENT}
                data-ad-slot={GOOGLE_ADSENSE_SLOT}
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            ) : phase === 'loading' ? (
              <Loader2 className="w-9 h-9 text-emerald-400 animate-spin" />
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-amber-500/20 to-sky-500/20 border border-white/15 flex items-center justify-center font-mono-tabular font-black text-2xl text-emerald-400">
                  {phase === 'ready' ? '✓' : `${secondsLeft}s`}
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    {t('Google AdSense Sponsored Break', 'গুগল অ্যাডসেন্স স্পনসরড অ্যাড')}
                  </div>
                  <p className="text-xs text-slate-400">
                    {phase === 'ready'
                      ? t('Ad finished! Tap Play Again for unlimited play.', 'অ্যাড শেষ! আবার খেলতে Play Again চাপুন।')
                      : t(
                          `Next unlimited match unlocks in ${secondsLeft} seconds...`,
                          `${secondsLeft} সেকেন্ড পরেই আনলিমিটেড খেলা শুরু হবে...`
                        )}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {phase === 'ready' ? (
            <button
              type="button"
              onClick={onComplete}
              className="w-full min-h-[50px] rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:brightness-110 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{t('Play Again', 'আবার খেলুন')}</span>
            </button>
          ) : (
            <div className="text-xs text-slate-400 font-medium">
              {t('Unlimited play resumes automatically after 10 seconds.', '১০ সেকেন্ড শেষে সরাসরি আবার খেলা শুরু করতে পারবেন।')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
