import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Ban, Calendar, Crown, Trophy } from 'lucide-react';
import { GAMES_CATALOG, type GameId } from '../data/gamesCatalog';
import { fetchLeaderboard, type PlayerAuthHandle } from '../lib/api';
import { formatSeasonDisplay, localizeServerText, useLanguage } from '../lib/i18n';
import { FacebookIconButton } from './FacebookButton';

interface OverallEntry {
  rank: number;
  uid: string;
  displayName: string;
  photoURL: string;
  rewardPoints: number;
  lifetimePoints: number;
  monthlyPoints: number;
  monthlyGamesPlayed: number;
  totalGamesPlayed: number;
}

interface GameEntry {
  rank: number;
  uid: string;
  displayName: string;
  photoURL: string;
  score: number;
}

interface SeasonInfo {
  seasonNumber: number;
  seasonLabel: string;
  seasonStartedAt: string;
}

interface CycleInfo {
  dayOfMonth: number;
  startsOnDay: number;
  endsOnDay: number;
  isActiveRound: boolean;
  daysRemaining: number;
}

const PRIZE_TIERS = [
  {
    rank: 1,
    enLabel: '1st Place',
    bnLabel: '১ম স্থান',
    enAmount: '3,000 Taka Win',
    bnAmount: '৩,০০০ টাকা পুরস্কার',
    cardClass: 'from-amber-500/25 via-slate-900 to-slate-900 border-amber-400/50',
    labelClass: 'text-amber-300',
    crownClass: 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]'
  },
  {
    rank: 2,
    enLabel: '2nd Place',
    bnLabel: '২য় স্থান',
    enAmount: '2,500 Taka Win',
    bnAmount: '২,৫০০ টাকা পুরস্কার',
    cardClass: 'from-slate-300/20 via-slate-900 to-slate-900 border-slate-300/40',
    labelClass: 'text-slate-200',
    crownClass: 'text-slate-200 drop-shadow-[0_0_8px_rgba(226,232,240,0.45)]'
  },
  {
    rank: 3,
    enLabel: '3rd Place',
    bnLabel: '৩য় স্থান',
    enAmount: '2,000 Taka Win',
    bnAmount: '২,০০০ টাকা পুরস্কার',
    cardClass: 'from-orange-500/20 via-slate-900 to-slate-900 border-orange-400/45',
    labelClass: 'text-orange-300',
    crownClass: 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]'
  }
] as const;

export function LeaderboardSection({
  currentUid,
  authHandle,
  isBanned = false,
  onBack
}: {
  currentUid?: string;
  authHandle?: PlayerAuthHandle | null;
  isBanned?: boolean;
  onBack?: () => void;
}) {
  const { lang, t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState<'overall' | GameId>('overall');
  const [overall, setOverall] = useState<OverallEntry[]>([]);
  const [perGame, setPerGame] = useState<Record<string, GameEntry[]>>({});
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [cycle, setCycle] = useState<CycleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (isBanned) {
      setOverall([]);
      setPerGame({});
      setLoading(false);
      return;
    }
    try {
      const data = await fetchLeaderboard(undefined, authHandle);
      setOverall(data.overallTop || []);
      setPerGame(data.perGame || {});
      if (data.season) setSeason(data.season);
      if (data.cycle) setCycle(data.cycle);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(localizeServerText(msg, lang, 'Could not load leaderboard.'));
    } finally {
      setLoading(false);
    }
  }, [authHandle, isBanned, lang]);

  useEffect(() => {
    setLoading(true);
    void loadData();
    if (isBanned) return;
    const timer = window.setInterval(() => {
      void loadData();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [isBanned, loadData]);

  if (isBanned) {
    return (
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto">
            <Ban className="w-6 h-6 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-white">{t('Account Blocked', 'অ্যাকাউন্ট ব্লক করা হয়েছে')}</h2>
          <p className="text-sm text-rose-200">
            {t(
              'The admin has blocked your account. You cannot view the leaderboard right now.',
              'অ্যাডমিন আপনার অ্যাকাউন্ট ব্লক করেছেন। আপনি এই মুহূর্তে লিডারবোর্ড দেখতে পারবেন না।'
            )}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('Back to Games', 'গেমসে ফিরে যান')}</span>
          </button>
        ) : (
          <div />
        )}
        <FacebookIconButton />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-400">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/35 font-extrabold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('LIVE', 'লাইভ')}</span>
            </span>
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {formatSeasonDisplay(lang, season?.seasonNumber, season?.seasonStartedAt, season?.seasonLabel)}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1.5">
            {t('LIVE Monthly Leaderboard', 'লাইভ মাসিক লিডারবোর্ড')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'Every month from 1st to 7th — competition ends on the 7th and the top 3 winners take home 7,500 Taka.',
              'প্রতি মাসের ১ থেকে ৭ তারিখ পর্যন্ত প্রতিযোগিতা চলে — ৭ তারিখে সমাপ্ত হয় এবং শীর্ষ ৩ বিজয়ী পান মোট ৭,৫০০ টাকা।'
            )}
          </p>
        </div>

        <div className="bg-amber-500/15 border border-amber-400/40 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 self-start sm:self-auto">
          <Crown className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="text-[11px] text-amber-200/90 font-medium">
              {cycle
                ? cycle.isActiveRound
                  ? t(`1st – 7th Active · ${cycle.daysRemaining}d left`, `১–৭ তারিখ চলছে · ${cycle.daysRemaining} দিন বাকি`)
                  : t('Monthly Round: 1st – 7th', 'মাসিক রাউন্ড: ১ – ৭ তারিখ')
                : t('1st – 7th Monthly Prize Pool', '১ – ৭ তারিখ মাসিক পুরস্কার')}
            </div>
            <div className="text-base font-extrabold font-mono-tabular text-amber-300">
              {t('7,500 Taka Total Pool', 'মোট ৭,৫০০ টাকা পুরস্কার')}
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Monthly Cash Prizes + Live Leaders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {PRIZE_TIERS.map((tier) => {
          const leader = overall.find((r) => r.rank === tier.rank);
          const isMe = leader && currentUid === leader.uid;
          return (
            <div
              key={tier.rank}
              className={`bg-gradient-to-br ${tier.cardClass} border rounded-2xl p-4 space-y-3`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className={`text-xs font-bold ${tier.labelClass}`}>
                    {lang === 'en' ? tier.enLabel : tier.bnLabel}
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold font-mono-tabular text-white mt-0.5">
                    {lang === 'en' ? tier.enAmount : tier.bnAmount}
                  </div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-center shrink-0">
                  <Crown className={`w-6 h-6 ${tier.crownClass}`} />
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2.5">
                {leader ? (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">
                        {leader.photoURL ? (
                          <img
                            src={leader.photoURL}
                            alt={leader.displayName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          leader.displayName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {leader.displayName}{' '}
                          {isMe && <span className="text-emerald-400">{t('(You)', '(আপনি)')}</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono-tabular">
                          {leader.monthlyGamesPlayed ?? leader.totalGamesPlayed}{' '}
                          {t('matches', 'টি ম্যাচ')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold font-mono-tabular text-emerald-400">
                        {leader.monthlyPoints ?? leader.lifetimePoints} {t('pts', 'পয়েন্ট')}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400">
                    {loading
                      ? t('Loading...', 'লোড হচ্ছে...')
                      : t('Empty spot — play to claim!', 'এখনো কেউ নেই — খেলে স্থান দখল করুন!')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setSelectedTab('overall')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
            selectedTab === 'overall'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          {t('LIVE Overall Ranking', 'লাইভ সামগ্রিক র‍্যাংকিং')}
        </button>
        {GAMES_CATALOG.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setSelectedTab(g.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              selectedTab === g.id
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {lang === 'en' ? g.title : g.bnTitle}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {t('Loading live leaderboard...', 'লাইভ লিডারবোর্ড লোড হচ্ছে...')}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-400">{error}</div>
        ) : selectedTab === 'overall' ? (
          overall.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              {t(
                'No scores submitted yet this round. Play any game to claim #1!',
                'এই রাউন্ডে এখনো কোনো স্কোর জমা হয়নি। গেম খেলে ১ম স্থান দখল করুন!'
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {overall.map((row) => {
                const isMe = currentUid === row.uid;
                const tier = PRIZE_TIERS.find((p) => p.rank === row.rank);
                return (
                  <div
                    key={row.uid}
                    className={`px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 ${
                      isMe ? 'bg-emerald-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-10 flex items-center justify-center gap-1 font-mono-tabular font-bold text-sm shrink-0 ${
                          tier ? tier.labelClass : 'text-slate-400'
                        }`}
                      >
                        {tier && <Crown className={`w-4 h-4 ${tier.crownClass}`} />}
                        <span>#{row.rank}</span>
                      </span>
                      <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">
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
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate flex items-center gap-2">
                          <span className="truncate">
                            {row.displayName}{' '}
                            {isMe && <span className="text-emerald-400 text-xs">{t('(You)', '(আপনি)')}</span>}
                          </span>
                          {tier && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/35 text-amber-300 text-xs font-mono-tabular font-bold shrink-0">
                              <Crown className={`w-3 h-3 ${tier.crownClass}`} />
                              {lang === 'en' ? tier.enAmount : tier.bnAmount}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {t('Played:', 'খেলেছেন:')}{' '}
                          <span className="font-mono-tabular text-slate-200">
                            {row.monthlyGamesPlayed ?? row.totalGamesPlayed}
                          </span>{' '}
                          {t('matches', 'টি ম্যাচ')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono-tabular font-bold text-emerald-400 text-base">
                        {row.monthlyPoints ?? row.lifetimePoints} {t('pts', 'পয়েন্ট')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (perGame[selectedTab] || []).length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {t('No high scores recorded for this game yet.', 'এই গেমে এখনো কোনো হাই স্কোর জমা হয়নি।')}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {(perGame[selectedTab] || []).map((row) => {
              const isMe = currentUid === row.uid;
              return (
                <div
                  key={row.uid}
                  className={`px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 ${
                    isMe ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 text-center font-mono-tabular font-bold text-sm ${
                        row.rank <= 3 ? 'text-amber-300' : 'text-slate-400'
                      }`}
                    >
                      #{row.rank}
                    </span>
                    <div className="text-sm font-semibold text-white truncate">
                      {row.displayName}{' '}
                      {isMe && <span className="text-emerald-400 text-xs">{t('(You)', '(আপনি)')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono-tabular font-bold text-amber-300">
                    <Trophy className="w-4 h-4" />
                    <span>{row.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
