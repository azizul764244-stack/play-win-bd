import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Ban, Calendar, Crown, Gamepad2, LogOut, Mail, MessageSquare, Trophy, User as UserIcon } from 'lucide-react';
import { AdminLoginGate } from './components/AdminLoginGate';
import { AdminPanel } from './components/AdminPanel';
import { ChatSection } from './components/ChatSection';
import { DownloadTopBar } from './components/DownloadTopBar';
import { FacebookIconButton, FacebookPillButton } from './components/FacebookButton';
import { BrandLogo3D, GameCardArtwork } from './components/GameCardArtwork';
import { GameShell, type GameRenderProps } from './components/GameShell';
import { LeaderboardSection } from './components/LeaderboardSection';
import { LoginModal } from './components/LoginModal';
import { RewardsSection } from './components/RewardsSection';
import { GAMES_BY_ID, GAMES_CATALOG, type GameCategory, type GameId } from './data/gamesCatalog';
import { BlockPuzzleGame } from './games/BlockPuzzleGame';
import { BrainIQGame } from './games/BrainIQGame';
import { BubbleShooterGame } from './games/BubbleShooterGame';
import { CandyMatchGame } from './games/CandyMatchGame';
import { CarParkingGame } from './games/CarParkingGame';
import { CarRacingGame } from './games/CarRacingGame';
import { EndlessRunnerGame } from './games/EndlessRunnerGame';
import { FootballPenaltyGame } from './games/FootballPenaltyGame';
import { FruitSliceGame } from './games/FruitSliceGame';
import { LudoVsAIGame } from './games/LudoVsAIGame';
import { TreasureHuntGame } from './games/TreasureHuntGame';
import { TypingSpeedGame } from './games/TypingSpeedGame';
import {
  fetchLeaderboard,
  fetchMyProfile,
  hasAdminSession,
  type PlayerAuthHandle,
  type SessionFinishResponse,
  type UserProfileResponse
} from './lib/api';
import {
  auth,
  GOOGLE_OAUTH_CLIENT_ID,
  isFedCmSupportedInFrame,
  logoutUser,
  signInWithGoogle,
  signInWithGoogleCredential
} from './lib/firebase';
import { localizeServerText, useLanguage } from './lib/i18n';

type ActiveTab = 'games' | 'leaderboard' | 'account' | 'chat' | 'admin';

const CATEGORY_FILTERS: Array<{ key: 'ALL' | GameCategory; enLabel: string; bnLabel: string }> = [
  { key: 'ALL', enLabel: 'All Games (12)', bnLabel: 'সব গেম (১২)' },
  { key: 'Arcade', enLabel: 'Arcade', bnLabel: 'আর্কেড' },
  { key: 'Puzzle', enLabel: 'Puzzle', bnLabel: 'পাজল' },
  { key: 'Action', enLabel: 'Action', bnLabel: 'অ্যাকশন' },
  { key: 'Board', enLabel: 'Board', bnLabel: 'বোর্ড' },
  { key: 'Brain', enLabel: 'Brain & Skill', bnLabel: 'মেধা ও দক্ষতা' }
];

function isAdminHash(): boolean {
  return window.location.hash.replace(/\/+$/, '').toLowerCase() === '#/admin';
}

export default function App() {
  const { lang, setLang, t } = useLanguage();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const justLoggedOutRef = useRef<boolean>(false);
  const oneTapPromptedRef = useRef<boolean>(false);

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [disabledGames, setDisabledGames] = useState<GameId[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => (isAdminHash() ? 'admin' : 'games'));
  const [activeGameId, setActiveGameId] = useState<GameId | null>(() => {
    if (isAdminHash()) return null;
    const hash = window.location.hash.replace('#/game/', '') as GameId;
    return hash && hash in GAMES_BY_ID ? hash : null;
  });
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | GameCategory>('ALL');
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminAuthed, setAdminAuthed] = useState<boolean>(() => hasAdminSession());
  const [loggingIn, setLoggingIn] = useState(false);

  const authHandle: PlayerAuthHandle | null = useMemo(() => {
    if (firebaseUser) return { kind: 'firebase', user: firebaseUser };
    return null;
  }, [firebaseUser]);

  const refreshPublicSettings = useCallback(async (handle: PlayerAuthHandle | null) => {
    try {
      const d = await fetchLeaderboard(undefined, handle);
      if (d.settings?.disabledGames) setDisabledGames(d.settings.disabledGames);
    } catch {
      // ignore public settings errors
    }
  }, []);

  const loadProfile = useCallback(
    async (handle: PlayerAuthHandle | null) => {
      if (!handle) {
        setProfile(null);
        await refreshPublicSettings(null);
        return;
      }
      try {
        const res = await fetchMyProfile(handle);
        setProfile(res);
        setDisabledGames(res.disabledGames || []);
      } catch (err) {
        console.warn('Profile load error:', err);
      }
    },
    [refreshPublicSettings]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setAuthReady(true);
      if (u) {
        justLoggedOutRef.current = false;
        setLoginModalOpen(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    void loadProfile(authHandle);
    if (!authHandle) return;
    const timer = window.setInterval(() => {
      void loadProfile(authHandle);
    }, 5000);
    const onFocus = () => {
      void loadProfile(authHandle);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [authHandle, loadProfile]);

  useEffect(() => {
    void refreshPublicSettings(authHandle);
  }, [authHandle, refreshPublicSettings]);

  // Admin panel opens ONLY via #/admin URL hash (gated by secret Number + Password)
  useEffect(() => {
    const onHashChange = () => {
      if (isAdminHash()) {
        setActiveGameId(null);
        setActiveTab('admin');
        return;
      }
      const hash = window.location.hash.replace('#/game/', '') as GameId;
      setActiveGameId(hash && hash in GAMES_BY_ID ? hash : null);
      setActiveTab((prev) => (prev === 'admin' ? 'games' : prev));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const switchTab = (tab: Exclude<ActiveTab, 'admin'>) => {
    if (isAdminHash()) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setActiveTab(tab);
  };

  const isUserBlocked = Boolean(profile?.user.isBanned);

  const openGame = (gameId: GameId) => {
    if (isUserBlocked) {
      setAuthError(
        t(
          'Your account has been blocked by the admin. You cannot play games.',
          'অ্যাডমিন আপনার অ্যাকাউন্ট ব্লক করেছেন। আপনি গেম খেলতে পারবেন না।'
        )
      );
      return;
    }
    window.location.hash = `#/game/${gameId}`;
    setActiveGameId(gameId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeGame = () => {
    window.location.hash = '';
    setActiveGameId(null);
  };

  const handleGoogleOneTapCredential = useCallback(
    async (idToken: string) => {
      setAuthError(null);
      try {
        await signInWithGoogleCredential(idToken);
        setLoginModalOpen(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : undefined;
        setAuthError(localizeServerText(msg, lang, 'Gmail login failed.'));
        throw err;
      }
    },
    [lang]
  );

  // Automatic 1-Tap Gmail popup when opening app (only when FedCM / identity-credentials-get is permitted)
  useEffect(() => {
    if (!authReady || firebaseUser || activeTab === 'admin' || justLoggedOutRef.current || oneTapPromptedRef.current) {
      return;
    }
    if (!GOOGLE_OAUTH_CLIENT_ID || !isFedCmSupportedInFrame()) return;

    let cancelled = false;
    let retryTimer: number | null = null;

    const triggerOneTap = (attempt = 0) => {
      if (cancelled || oneTapPromptedRef.current || !isFedCmSupportedInFrame()) return;
      const win = window as unknown as {
        google?: {
          accounts?: {
            id?: {
              initialize: (cfg: {
                client_id: string;
                callback: (resp: { credential?: string }) => void;
                auto_select?: boolean;
                cancel_on_tap_outside?: boolean;
                use_fedcm_for_prompt?: boolean;
                itp_support?: boolean;
              }) => void;
              prompt: () => void;
            };
          };
        };
      };
      const gsi = win.google?.accounts?.id;
      if (!gsi) {
        if (attempt < 15) {
          retryTimer = window.setTimeout(() => triggerOneTap(attempt + 1), 300);
        }
        return;
      }
      oneTapPromptedRef.current = true;
      try {
        gsi.initialize({
          client_id: GOOGLE_OAUTH_CLIENT_ID,
          callback: (resp) => {
            if (resp.credential) {
              void handleGoogleOneTapCredential(resp.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
          itp_support: true
        });
        gsi.prompt();
      } catch {
        // ignore prompt errors in restricted environments
      }
    };

    triggerOneTap();
    return () => {
      cancelled = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [activeTab, authReady, firebaseUser, handleGoogleOneTapCredential]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
      setLoginModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      setAuthError(localizeServerText(msg, lang, 'Gmail login failed.'));
      throw err;
    }
  };

  // 1-Click Gmail Auto-Connect directly on button tap (with modal fallback if popup fails)
  const triggerOneClickGmailLogin = async () => {
    if (loggingIn) return;
    setLoggingIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      setLoginModalOpen(false);
    } catch {
      setLoginModalOpen(true);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    justLoggedOutRef.current = true;
    oneTapPromptedRef.current = true;
    if (firebaseUser) {
      await logoutUser();
    }
    setProfile(null);
  };

  const handleScoreSubmitted = useCallback(
    (_res: SessionFinishResponse) => {
      void loadProfile(authHandle);
    },
    [authHandle, loadProfile]
  );

  const filteredGames = useMemo(() => {
    if (categoryFilter === 'ALL') return GAMES_CATALOG;
    return GAMES_CATALOG.filter((g) => g.category === categoryFilter);
  }, [categoryFilter]);

  const renderSpecificGame = (gameId: GameId, props: GameRenderProps) => {
    switch (gameId) {
      case 'endless-runner':
        return <EndlessRunnerGame {...props} />;
      case 'candy-match':
        return <CandyMatchGame {...props} />;
      case 'car-racing':
        return <CarRacingGame {...props} />;
      case 'bubble-shooter':
        return <BubbleShooterGame {...props} />;
      case 'fruit-slice':
        return <FruitSliceGame {...props} />;
      case 'brain-iq':
        return <BrainIQGame {...props} />;
      case 'football-penalty':
        return <FootballPenaltyGame {...props} />;
      case 'block-puzzle':
        return <BlockPuzzleGame {...props} />;
      case 'ludo-ai':
        return <LudoVsAIGame {...props} />;
      case 'car-parking':
        return <CarParkingGame {...props} />;
      case 'treasure-hunt':
        return <TreasureHuntGame {...props} />;
      case 'typing-speed':
        return <TypingSpeedGame {...props} />;
    }
  };

  // Dedicated 100% Full-Screen Game View
  if (activeGameId && activeGameId in GAMES_BY_ID) {
    if (isUserBlocked) {
      return (
        <div className="min-h-screen bg-[#0B1120] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto">
              <Ban className="w-7 h-7 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{t('Account Blocked', 'অ্যাকাউন্ট ব্লক করা হয়েছে')}</h2>
            <p className="text-sm text-rose-200">
              {t(
                'The admin has blocked your account. You cannot play games until unblocked.',
                'অ্যাডমিন আপনার অ্যাকাউন্ট ব্লক করেছেন। আনব্লক না হওয়া পর্যন্ত আপনি গেম খেলতে পারবেন না।'
              )}
            </p>
            <button
              type="button"
              onClick={closeGame}
              className="w-full min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
            >
              {t('Back to Home', 'হোম পেজে ফিরে যান')}
            </button>
          </div>
        </div>
      );
    }
    const game = GAMES_BY_ID[activeGameId];
    const personalHighScore = profile?.user.highScores?.[activeGameId] || 0;
    return (
      <GameShell
        game={game}
        authHandle={authHandle}
        personalHighScore={personalHighScore}
        onBack={closeGame}
        onRequestLogin={() => void triggerOneClickGmailLogin()}
        onScoreSubmitted={handleScoreSubmitted}
        renderGame={(props) => renderSpecificGame(activeGameId, props)}
      />
    );
  }

  const rewardBalance = profile?.user.rewardPoints ?? 0;
  const activeDisplayName = profile?.user.displayName || firebaseUser?.displayName || 'Player';
  const activeUid = profile?.user.uid || firebaseUser?.uid;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col pt-[78px] pb-20 md:pb-0">
      <DownloadTopBar />

      {/* Top Navigation Bar */}
      <header className="sticky top-[78px] z-30 bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
          <button
            type="button"
            onClick={() => switchTab('games')}
            className="shrink-0 text-left"
            aria-label="PLAY & WIN BD"
          >
            <BrandLogo3D compact />
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => switchTab('games')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'games' ? 'text-emerald-400 border-b-2 border-emerald-400' : ''
              }`}
            >
              {t('Games', 'গেমস')}
            </button>
            <button
              type="button"
              onClick={() => switchTab('leaderboard')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'leaderboard' ? 'text-emerald-400 border-b-2 border-emerald-400' : ''
              }`}
            >
              {t('Leaderboard', 'লিডারবোর্ড')}
            </button>
            <button
              type="button"
              onClick={() => switchTab('chat')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'chat' ? 'text-emerald-400 border-b-2 border-emerald-400' : ''
              }`}
            >
              {t('Message Admin', 'অ্যাডমিনকে মেসেজ')}
            </button>
            <button
              type="button"
              onClick={() => switchTab('account')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'account' ? 'text-emerald-400 border-b-2 border-emerald-400' : ''
              }`}
            >
              {t('Account', 'অ্যাকাউন্ট')}
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <FacebookIconButton />

            {/* Single-Language Switcher */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  lang === 'en' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('bn')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  lang === 'bn' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                বাংলা
              </button>
            </div>

            {!authReady ? (
              <div className="h-10 w-28 rounded-xl bg-slate-800 animate-pulse" />
            ) : authHandle ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => switchTab('account')}
                  className="min-h-[40px] px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500/50 flex items-center gap-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                >
                  <span className="text-slate-200 max-w-[75px] sm:max-w-[105px] truncate">{activeDisplayName}</span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono-tabular text-emerald-400 font-bold">{rewardBalance} pts</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition-colors"
                  title={t('Logout', 'লগআউট')}
                  aria-label={t('Logout', 'লগআউট')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={loggingIn}
                onClick={() => void triggerOneClickGmailLogin()}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>{loggingIn ? '...' : t('Login with Gmail', 'জিমেইল লগইন')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {isUserBlocked && (
        <div className="max-w-7xl mx-auto px-4 pt-3 w-full">
          <div className="px-4 py-3 rounded-xl bg-rose-500/20 border border-rose-500/45 text-xs sm:text-sm text-rose-100 flex items-center gap-2 font-semibold">
            <Ban className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {t(
                'Your account has been blocked by the admin. You cannot play games, message, or view the leaderboard.',
                'অ্যাডমিন আপনার অ্যাকাউন্ট ব্লক করেছেন। আপনি গেম খেলতে, মেসেজ করতে এবং লিডারবোর্ড দেখতে পারবেন না।'
              )}
            </span>
          </div>
        </div>
      )}

      {authError && (
        <div className="max-w-7xl mx-auto px-4 pt-3 w-full">
          <div className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
            {authError}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'games' && (
          <>
            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch bg-slate-900/75 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center space-y-5">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {t(
                        'Every Month 1st – 7th · 12 Full-Screen Touch Games',
                        'প্রতি মাসের ১ – ৭ তারিখ · ১২টি ফুল-স্ক্রিন গেম'
                      )}
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight text-balance">
                    {t(
                      'Play Unlimited & Win Monthly Cash Prizes',
                      'আনলিমিটেড খেলুন ও মাসিক নগদ পুরস্কার জিতুন'
                    )}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                    {t(
                      '1st Place — 3,000 Taka Win · 2nd Place — 2,500 Taka Win · 3rd Place — 2,000 Taka Win. Plays run 1st to 7th of every month!',
                      '১ম স্থান — ৩,০০০ টাকা · ২য় স্থান — ২,৫০০ টাকা · ৩য় স্থান — ২,০০০ টাকা। প্রতি মাসের ১ থেকে ৭ তারিখ পর্যন্ত প্রতিযোগিতা চলে!'
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {!authHandle && (
                      <button
                        type="button"
                        disabled={loggingIn}
                        onClick={() => void triggerOneClickGmailLogin()}
                        className="min-h-[48px] px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                      >
                        <Mail className="w-4 h-4" /> {t('Login with Gmail', 'জিমেইল দিয়ে লগইন')}
                      </button>
                    )}
                    <a
                      href="#games-catalog"
                      className="min-h-[48px] px-5 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-200 font-bold text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                      <Gamepad2 className="w-4 h-4" /> {t('Play Games', 'গেমস খেলুন')}
                    </a>
                    <button
                      type="button"
                      onClick={() => switchTab('leaderboard')}
                      className="min-h-[48px] px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                      <Trophy className="w-4 h-4 text-amber-400" /> {t('LIVE Leaderboard', 'লাইভ লিডারবোর্ড')}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchTab('chat')}
                      className="min-h-[48px] px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400" /> {t('Message Admin', 'অ্যাডমিনকে মেসেজ')}
                    </button>
                    <FacebookPillButton />
                  </div>
                </div>

                <div className="lg:col-span-6 relative min-h-[240px] lg:min-h-[360px] bg-slate-950">
                  <img
                    src="/src/assets/images/hero_play_win_bd_1795549036102.jpg"
                    alt="PLAY & WIN BD Gaming Arena"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-slate-900/60 lg:via-transparent" />
                </div>
              </div>

              {/* Monthly Prize Tiers Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
                <div className="bg-slate-900/70 border border-amber-400/35 rounded-2xl p-4 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-amber-300 font-semibold">{t('1st Place', '১ম স্থান')}</div>
                    <div className="text-lg sm:text-xl font-extrabold font-mono-tabular text-white mt-0.5">
                      {t('3,000 Taka Win', '৩,০০০ টাকা')}
                    </div>
                  </div>
                  <Crown className="w-6 h-6 text-amber-400 shrink-0" />
                </div>
                <div className="bg-slate-900/70 border border-slate-400/30 rounded-2xl p-4 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-300 font-semibold">{t('2nd Place', '২য় স্থান')}</div>
                    <div className="text-lg sm:text-xl font-extrabold font-mono-tabular text-white mt-0.5">
                      {t('2,500 Taka Win', '২,৫০০ টাকা')}
                    </div>
                  </div>
                  <Crown className="w-6 h-6 text-slate-300 shrink-0" />
                </div>
                <div className="bg-slate-900/70 border border-orange-400/30 rounded-2xl p-4 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-orange-300 font-semibold">{t('3rd Place', '৩য় স্থান')}</div>
                    <div className="text-lg sm:text-xl font-extrabold font-mono-tabular text-white mt-0.5">
                      {t('2,000 Taka Win', '২,০০০ টাকা')}
                    </div>
                  </div>
                  <Crown className="w-6 h-6 text-orange-400 shrink-0" />
                </div>
                <div className="bg-slate-900/70 border border-emerald-500/30 rounded-2xl p-4">
                  <div className="text-xs text-emerald-300 font-semibold">
                    {t('Schedule · Unlimited', 'সময়সূচি · আনলিমিটেড')}
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold font-mono-tabular text-white mt-0.5">
                    {t('1st – 7th Monthly', '১ – ৭ তারিখ মাসিক')}
                  </div>
                </div>
              </div>
            </section>

            {/* 12 Games Catalog Section — ZERO TEXT BELOW GAMES */}
            <section id="games-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    {t('12 Premium Games', '১২টি প্রিমিয়াম গেম')}
                  </h2>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {CATEGORY_FILTERS.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategoryFilter(cat.key)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        categoryFilter === cat.key
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {lang === 'en' ? cat.enLabel : cat.bnLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredGames.map((game) => {
                  const isDisabled = isUserBlocked || disabledGames.includes(game.id);
                  const cardTitle = lang === 'en' ? game.title : game.bnTitle;
                  const disabledLabel = isUserBlocked
                    ? t('Blocked', 'ব্লকড')
                    : disabledGames.includes(game.id)
                    ? t('Closed', 'বন্ধ')
                    : null;

                  return (
                    <button
                      key={game.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && openGame(game.id)}
                      className={`block w-full text-left rounded-3xl transition-transform ${
                        isDisabled
                          ? 'opacity-60 cursor-not-allowed'
                          : 'hover:-translate-y-1 cursor-pointer'
                      }`}
                      aria-label={cardTitle}
                    >
                      <GameCardArtwork
                        gameId={game.id}
                        accentColor={game.accentColor}
                        title={cardTitle}
                        disabledLabel={disabledLabel}
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardSection
            currentUid={activeUid}
            authHandle={authHandle}
            isBanned={isUserBlocked}
            onBack={() => switchTab('games')}
          />
        )}
        {activeTab === 'account' && (
          <RewardsSection
            authHandle={authHandle}
            profile={profile}
            onRequestLogin={() => void triggerOneClickGmailLogin()}
            onLogout={handleLogout}
            onOpenMessageAdmin={() => switchTab('chat')}
          />
        )}
        {activeTab === 'chat' && (
          <ChatSection
            authHandle={authHandle}
            isBanned={isUserBlocked}
            onRequestLogin={() => void triggerOneClickGmailLogin()}
          />
        )}

        {/* Secret Admin Panel Route — ONLY accessible via #/admin URL + Mobile Number + Password */}
        {activeTab === 'admin' && (
          adminAuthed ? (
            <AdminPanel
              onProfileUpdated={() => loadProfile(authHandle)}
              onAdminLogout={() => {
                setAdminAuthed(false);
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                setActiveTab('games');
              }}
            />
          ) : (
            <AdminLoginGate
              onSuccess={() => setAdminAuthed(true)}
              onCancel={() => {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                setActiveTab('games');
              }}
            />
          )
        )}
      </main>

      {/* Footer with Facebook Page link */}
      <footer className="border-t border-slate-800/80 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            {t(
              'PLAY & WIN BD · 1st–7th Monthly Cash Prizes: 3,000 / 2,500 / 2,000 Taka',
              'PLAY & WIN BD · প্রতি মাসের ১–৭ তারিখ নগদ পুরস্কার: ৩,০০০ / ২,৫০০ / ২,০০০ টাকা'
            )}
          </span>
          <FacebookPillButton compact />
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0B1120]/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 h-16">
        <button
          type="button"
          onClick={() => switchTab('games')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            activeTab === 'games' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span>{t('Games', 'গেমস')}</span>
        </button>
        <button
          type="button"
          onClick={() => switchTab('leaderboard')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            activeTab === 'leaderboard' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span>{t('Leaderboard', 'লিডারবোর্ড')}</span>
        </button>
        <button
          type="button"
          onClick={() => switchTab('chat')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            activeTab === 'chat' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span>{t('Message Admin', 'মেসেজ')}</span>
        </button>
        <button
          type="button"
          onClick={() => switchTab('account')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            activeTab === 'account' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span>{t('Account', 'অ্যাকাউন্ট')}</span>
        </button>
      </nav>

      {/* Fallback 1-Click Gmail Modal */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onGoogleLogin={handleGoogleLogin}
        onGoogleOneTapCredential={handleGoogleOneTapCredential}
      />
    </div>
  );
}
