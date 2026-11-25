import React, { useEffect, useRef, useState } from 'react';
import { Gamepad2 } from 'lucide-react';

// Paste your direct APK download URL in VITE_APK_DOWNLOAD_URL or replace the fallback URL below
export const APK_DOWNLOAD_URL =
  (import.meta.env.VITE_APK_DOWNLOAD_URL || '').trim() || '/play-win-bd.apk';

const LOGO_IMG = '/src/assets/images/brand_logo_3d_digital_1795607738165.jpg';

export function DownloadTopBar() {
  const [imgErr, setImgErr] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleDownloadClick = () => {
    setShowToast(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setShowToast(false);
      timerRef.current = null;
    }, 3500);
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 w-full bg-[#00C853] text-white shadow-[0_4px_18px_rgba(0,0,0,0.35)] border-b border-emerald-700/40 px-3 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left Side: App Logo + App Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950/90 border border-white/40 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
              {!imgErr ? (
                <img
                  src={LOGO_IMG}
                  alt="PLAY & WIN BD"
                  referrerPolicy="no-referrer"
                  onError={() => setImgErr(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Gamepad2 className="w-5 h-5 text-[#00C853]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-lg font-black tracking-tight text-white truncate drop-shadow-sm">
                PLAY &amp; WIN BD
              </div>
            </div>
          </div>

          {/* Right Side: Big Yellow DOWNLOAD Button + "Free - 12 MB" below */}
          <div className="flex flex-col items-center shrink-0">
            <a
              href={APK_DOWNLOAD_URL}
              download="PLAY_WIN_BD.apk"
              onClick={handleDownloadClick}
              className="min-h-[44px] px-4 sm:px-6 py-2 rounded-xl bg-[#FFD600] hover:bg-[#FFEA00] active:scale-95 text-black font-extrabold text-sm sm:text-base tracking-wide inline-flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.28)] transition-transform whitespace-nowrap"
            >
              <span>⬇️ DOWNLOAD</span>
            </a>
            <span className="text-[11px] font-bold text-white/95 leading-tight mt-0.5">
              Free - 12 MB
            </span>
          </div>
        </div>
      </div>

      {/* Download Toast */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-full bg-slate-950 border border-[#00C853] text-white text-xs sm:text-sm font-bold shadow-[0_10px_30px_rgba(0,0,0,0.65)] whitespace-nowrap"
        >
          Downloading... Please wait
        </div>
      )}
    </>
  );
}
