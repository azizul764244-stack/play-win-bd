import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Crown,
  Play,
  RotateCcw,
  ShieldAlert,
  Trophy,
  Volume2,
  VolumeX
} from 'lucide-react';
import type { GameMeta } from '../data/gamesCatalog';
import {
  fetchLeaderboard,
  finishGameSession,
  startGameSession,
  type PlayerAuthHandle,
  type SessionFinishResponse
} from '../lib/api';
import { audioEngine } from '../lib/AudioEngine';
import { localizeServerText, useLanguage } from '../lib/i18n';
import { AdOverlayModal } from './AdOverlayModal';
import { FacebookIconButton } from './FacebookButton';
import { GameLogo3D } from './GameCardArtwork';
import { TouchTrailOverlay } from './TouchTrailOverlay';

export type GameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export interface GameRenderProps {
  status: GameStatus;
  runKey: number;
  reviveKey?: number;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: (finalScore: number, stats?: Record<string, unknown>) => void;
}

interface GameShellProps {
  game: GameMeta;
  authHandle: PlayerAuthHandle | null;
  personalHighScore: number;
  onBack: () => void;
  onRequestLogin: () => void;
  onScoreSubmitted: (result: SessionFinishResponse) => void;
  renderGame: (props: GameRenderProps) => React.ReactNode;
}

interface LiveLeaderEntry {
  rank: number;
  uid: string;
  displayName: string;
  photoURL: string;
  monthlyPoints: number;
  lifetimePoints: number;
}

const LOCAL_HS_PREFIX = 'pwbd_hs_';

const PRIZE_BANNER_TIERS = [
  {
    rank: 1,
    enPlace: '1st Place',
    bnPlace: '১ম স্থান',
    enPrize: '3,000 Taka Win',
    bnPrize: '৩,০০০ টাকা পুরস্কার',
    ringClass: 'border-amber-400/55 bg-gradient-to-b from-amber-500/25 to-slate-950/90',
    crownClass: 'text-amber-400'
  },
  {
    rank: 2,
    enPlace: '2nd Place',
    bnPlace: '২য় স্থান',
    enPrize: '2,500 Taka Win',
    bnPrize: '২,৫০০ টাকা পুরস্কার',
    ringClass: 'border-slate-300/45 bg-gradient-to-b from-slate-300/20 to-slate-950/90',
    crownClass: 'text-slate-200'
  },
  {
    rank: 3,
    enPlace: '3rd Place',
    bnPlace: '৩য় স্থান',
    enPrize: '2,000 Taka Win',
    bnPrize: '২,০০০ টাকা পুরস্কার',
    ringClass: 'border-orange-400/45 bg-gradient-to-b from-orange-500/20 to-slate-950/90',
    crownClass: 'text-orange-400'
  }
] as const;

export function GameShell({
  game,
  authHandle,
  personalHighScore,
  onBack,
  onRequestLogin,
  onScoreSubmitted,
  renderGame
}: GameShellProps) {
  const { lang, t } = useLanguage();
  const gameTitle = lang === 'en' ? game.title : game.bnTitle;
  const [status, setStatus] = useState<GameStatus>('READY');

  const [runKey, setRunKey] = useState(0);
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(() => audioEngine.isMuted());

  const [localHighScore, setLocalHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_HS_PREFIX}${game.id}`);
      return saved ? Math.max(0, Number(saved) || 0) : 0;
    } catch {
      return 0;
    }
  });
  const effectiveHighScore = Math.max(personalHighScore, localHighScore);

  const sessionRef = useRef<{ sessionId: string; nonce: string } | null>(null);
  const startTimeRef = useRef<number>(0);
  const gameOverHandledRef = useRef<boolean>(false);

  const [startingSession, setStartingSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SessionFinishResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // 10-second Google AdSense Ad on Death / Loss
  const [adOpen, setAdOpen] = useState(false);
  const [adFinished, setAdFinished] = useState(false);

  // Live Leaderboard shown cleanly below Banner & PLAY button
  const [liveTop, setLiveTop] = useState<LiveLeaderEntry[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);

  const loadLiveLeaderboard = useCallback(async () => {
    try {
      const data = await fetchLeaderboard(undefined, authHandle);
      setLiveTop((data.overallTop || []).slice(0, 10));
    } catch {
      // ignore transient poll failures
    } finally {
      setLiveLoading(false);
    }
  }, [authHandle]);

  useEffect(() => {
    return audioEngine.subscribe(setMuted);
  }, []);

  useEffect(() => {
    setLiveLoading(true);
    void loadLiveLeaderboard();
    const timer = window.setInterval(() => {
      void loadLiveLeaderboard();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [loadLiveLeaderboard]);

  // Reset cleanly on game change — instant game ground render with ZERO entry delay or entry ad
  useEffect(() => {
    setStatus('READY');
    setScore(0);
    setSubmissionResult(null);
    setSessionError(null);
    setAdOpen(false);
    setAdFinished(false);
    sessionRef.current = null;
    gameOverHandledRef.current = false;
    audioEngine.stopBGM();
    return () => {
      audioEngine.stopBGM();
    };
  }, [game.id]);

  // Sync background music with active play state
  useEffect(() => {
    if (status === 'PLAYING' && !adOpen) {
      audioEngine.startBGM(game.category);
    } else if (adOpen) {
      audioEngine.pauseBGM();
    } else {
      audioEngine.stopBGM();
    }
  }, [adOpen, game.category, status]);

  const toggleMute = () => {
    const nextMuted = audioEngine.toggleMute();
    setMuted(nextMuted);
    if (!nextMuted) {
      audioEngine.click();
    }
  };

  const handlePlayOrRestart = useCallback(async () => {
    audioEngine.unlock();
    audioEngine.click();
    setSessionError(null);
    setSubmissionResult(null);
    setAdOpen(false);
    setAdFinished(false);
    gameOverHandledRef.current = false;
    setScore(0);

    if (authHandle) {
      setStartingSession(true);
      try {
        const s = await startGameSession(authHandle, game.id);
        sessionRef.current = { sessionId: s.sessionId, nonce: s.nonce };
      } catch (err) {
        sessionRef.current = null;
        const msg = err instanceof Error ? err.message : undefined;
        setSessionError(localizeServerText(msg, lang, 'Could not start game session.'));
        setStartingSession(false);
        return;
      } finally {
        setStartingSession(false);
      }
    } else {
      sessionRef.current = null;
    }

    startTimeRef.current = Date.now();
    setRunKey((k) => k + 1);
    setStatus('PLAYING');
  }, [authHandle, game.id, lang]);

  const finalizeMatchSubmission = useCallback(
    async (finalScore: number, stats?: Record<string, unknown>) => {
      const cleanScore = Math.max(0, Math.floor(finalScore));
      const activeSession = sessionRef.current;
      sessionRef.current = null;
      if (!authHandle || !activeSession) return;

      const activeDurationMs = Math.max(0, Date.now() - startTimeRef.current);

      setSubmitting(true);
      try {
        const res = await finishGameSession(authHandle, {
          sessionId: activeSession.sessionId,
          nonce: activeSession.nonce,
          gameId: game.id,
          score: cleanScore,
          durationMs: activeDurationMs,
          pausedMs: 0,
          stats
        });
        setSubmissionResult(res);
        if (res.verified) {
          onScoreSubmitted(res);
          void loadLiveLeaderboard();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : undefined;
        setSessionError(localizeServerText(msg, lang, 'Could not verify score.'));
      } finally {
        setSubmitting(false);
      }
    },
    [authHandle, game.id, lang, loadLiveLeaderboard, onScoreSubmitted]
  );

  const handleGameOver = useCallback(
    (finalScore: number, stats?: Record<string, unknown>) => {
      if (gameOverHandledRef.current) return;
      gameOverHandledRef.current = true;
      audioEngine.stopBGM();

      const cleanScore = Math.max(0, Math.floor(finalScore));
      setScore(cleanScore);
      setStatus('GAME_OVER');

      if (cleanScore > localHighScore) {
        setLocalHighScore(cleanScore);
        try {
          localStorage.setItem(`${LOCAL_HS_PREFIX}${game.id}`, String(cleanScore));
        } catch {
          // ignore
        }
      }

      void finalizeMatchSubmission(cleanScore, stats);
      // Show 10-second Google AdSense Ad on player death / loss
      setAdFinished(false);
      setAdOpen(true);
    },
    [finalizeMatchSubmission, game.id, localHighScore]
  );

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] bg-[#060A14] text-slate-100 overflow-hidden select-none">
      {/* 100% Full-Screen Game Field (renders immediately!) */}
      <div className="w-full h-full relative">
        {renderGame({
          status,
          runKey,
          reviveKey: 0,
          score,
          setScore,
          onGameOver: handleGameOver
        })}
      </div>

      {/* Glowing Neon Finger Drag Trail across ALL 12 games */}
      <TouchTrailOverlay />

      {/* Minimal Floating Top-Corner Chrome (no game buttons inside gameplay) */}
      <div className="fixed top-3 left-3 right-3 z-30 pointer-events-none flex items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              audioEngine.stopBGM();
              onBack();
            }}
            className="w-11 h-11 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/15 hover:bg-slate-900 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
            aria-label={t('Home', 'হোম')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {status === 'PLAYING' && (
            <div className="h-11 px-3.5 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/15 flex items-center gap-3 shadow-lg">
              <span className="font-mono-tabular font-extrabold text-base text-emerald-400">{score}</span>
              <span className="w-px h-4 bg-white/15" />
              <span className="font-mono-tabular font-bold text-xs text-amber-300 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                {effectiveHighScore}
              </span>
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <FacebookIconButton className="!rounded-full w-11 h-11" />
          <button
            type="button"
            onClick={toggleMute}
            className="w-11 h-11 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/15 hover:bg-slate-900 flex items-center justify-center shadow-lg active:scale-95"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* READY SCREEN: Banner (1st 3,000 / 2nd 2,500 / 3rd 2,000 · 1st–7th) -> PLAY Button -> LIVE Leaderboard */}
      {status === 'READY' && (
        <div className="fixed inset-0 z-20 bg-slate-950/60 backdrop-blur-sm overflow-y-auto px-4 pt-16 pb-8 flex flex-col items-center">
          <div className="max-w-md w-full flex flex-col items-center text-center gap-4 my-auto">
            {/* Game Title shown ONLY ONCE */}
            <div className="flex flex-col items-center gap-2.5">
              <GameLogo3D gameId={game.id} accentColor={game.accentColor} size="md" />
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)]">
                {gameTitle}
              </h1>
            </div>

            {/* Prize Banner ABOVE PLAY Button */}
            <div className="w-full rounded-2xl bg-slate-950/90 border border-amber-400/35 p-3 space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <Crown className="w-3.5 h-3.5" />
                  <span>{t('Monthly Cash Prizes', 'মাসিক নগদ পুরস্কার')}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <Calendar className="w-3 h-3" />
                  <span>{t('1st – 7th of Month · Ends 7th', 'প্রতি মাসের ১ – ৭ তারিখ')}</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {PRIZE_BANNER_TIERS.map((tier) => (
                  <div key={tier.rank} className={`rounded-xl border p-2 text-center ${tier.ringClass}`}>
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-200">
                      <Crown className={`w-3 h-3 ${tier.crownClass}`} />
                      <span>{lang === 'en' ? tier.enPlace : tier.bnPlace}</span>
                    </div>
                    <div className="text-[11px] sm:text-xs font-extrabold font-mono-tabular text-white mt-0.5">
                      {lang === 'en' ? tier.enPrize : tier.bnPrize}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {sessionError && (
              <div className="w-full px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
                {sessionError}
              </div>
            )}

            {/* PLAY Button */}
            <button
              type="button"
              onClick={handlePlayOrRestart}
              disabled={startingSession}
              className="relative group w-64 h-16 rounded-full bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-slate-950 font-black text-xl tracking-wide shadow-[0_12px_35px_rgba(16,185,129,0.55),inset_0_2px_2px_rgba(255,255,255,0.65)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 overflow-hidden disabled:opacity-60"
            >
              <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
              <Play className="w-6 h-6 fill-current relative z-10" />
              <span className="relative z-10">{startingSession ? '...' : t('PLAY', 'খেলুন')}</span>
            </button>

            {!authHandle && (
              <button
                type="button"
                onClick={onRequestLogin}
                className="text-xs font-bold text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                {t('Login with Gmail to save points to LIVE Leaderboard', 'লাইভ লিডারবোর্ডে পয়েন্ট জমাতে জিমেইল লগইন করুন')}
              </button>
            )}

            {/* LIVE Leaderboard BELOW Banner & PLAY Button */}
            <div className="w-full rounded-2xl bg-slate-950/90 border border-white/10 p-3.5 text-left space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{t('LIVE Leaderboard', 'লাইভ লিডারবোর্ড')}</span>
                  </span>
                </div>
                <span className="text-[11px] font-mono-tabular text-slate-400">
                  {t('Unlimited Play', 'আনলিমিটেড খেলা')}
                </span>
              </div>

              {liveLoading ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  {t('Loading live ranking...', 'লাইভ র‍্যাংকিং লোড হচ্ছে...')}
                </div>
              ) : liveTop.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  {t('Be the first to score and take 1st Place!', 'প্রথম স্কোর করে ১ম স্থান দখল করুন!')}
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-48 overflow-y-auto pr-1">
                  {liveTop.map((row) => {
                    const isMe = authHandle?.user.uid === row.uid;
                    return (
                      <div
                        key={row.uid}
                        className={`py-2 px-2 rounded-lg flex items-center justify-between gap-2 text-xs ${
                          isMe ? 'bg-emerald-500/15' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-6 font-mono-tabular font-extrabold shrink-0 ${
                              row.rank === 1
                                ? 'text-amber-300'
                                : row.rank === 2
                                ? 'text-slate-200'
                                : row.rank === 3
                                ? 'text-orange-300'
                                : 'text-slate-400'
                            }`}
                          >
                            #{row.rank}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-bold text-emerald-300 shrink-0">
                            {row.photoURL ? (
                              <img
                                src={row.photoURL}
                                alt={row.displayName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              row.displayName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <span className="font-semibold text-white truncate">
                            {row.displayName}
                            {isMe ? ` ${t('(You)', '(আপনি)')}` : ''}
                          </span>
                        </div>
                        <span className="font-mono-tabular font-extrabold text-emerald-400 shrink-0">
                          {row.monthlyPoints ?? row.lifetimePoints} {t('pts', 'পয়েন্ট')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER Modal (appears cleanly after 10-second Google AdSense Ad completes) */}
      {status === 'GAME_OVER' && adFinished && (
        <div className="fixed inset-0 z-30 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900/95 border border-white/15 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="text-xs font-extrabold tracking-widest text-rose-400 uppercase">
              {t('MATCH FINISHED', 'ম্যাচ শেষ')}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <div className="text-[11px] text-slate-400">{t('Score', 'স্কোর')}</div>
                <div className="text-2xl font-bold font-mono-tabular text-emerald-400">{score}</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <div className="text-[11px] text-slate-400">{t('High Score', 'হাই স্কোর')}</div>
                <div className="text-2xl font-bold font-mono-tabular text-amber-300">
                  {submissionResult ? submissionResult.highScore : effectiveHighScore}
                </div>
              </div>
            </div>

            {sessionError && (
              <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs">
                {sessionError}
              </div>
            )}

            {authHandle && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs space-y-1">
                {submitting ? (
                  <div className="text-slate-300">{t('Updating LIVE Leaderboard...', 'লাইভ লিডারবোর্ড আপডেট হচ্ছে...')}</div>
                ) : submissionResult ? (
                  <>
                    <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                      {submissionResult.verified ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                      )}
                      <span className={submissionResult.verified ? 'text-emerald-300' : 'text-rose-300'}>
                        {submissionResult.verified ? `+${submissionResult.awardedPoints} pts` : '0 pts'}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      {submissionResult.verified
                        ? t('Points added! Play unlimited matches anytime.', 'পয়েন্ট যোগ হয়েছে! আনলিমিটেড খেলতে থাকুন।')
                        : localizeServerText(submissionResult.message, lang, 'Score could not be verified.')}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handlePlayOrRestart}
                disabled={startingSession}
                className="flex-1 h-12 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" /> {t('PLAY AGAIN', 'আবার খেলুন')}
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.stopBGM();
                  onBack();
                }}
                className="h-12 px-5 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm"
              >
                {t('HOME', 'হোম')}
              </button>
              <FacebookIconButton className="!rounded-full w-12 h-12" />
            </div>
          </div>
        </div>
      )}

      {/* 10-Second Google AdSense Ad on Death / Loss */}
      <AdOverlayModal
        open={adOpen}
        kind="gameover-adsense"
        onComplete={() => {
          setAdOpen(false);
          setAdFinished(true);
        }}
        onSkipOrDismiss={() => {
          setAdOpen(false);
          setAdFinished(true);
        }}
        onLoadFailed={() => {
          setAdOpen(false);
          setAdFinished(true);
        }}
      />
    </div>
  );
}
