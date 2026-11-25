import React, { useEffect, useState } from 'react';
import { ArrowLeft, Ban, Calendar, Crown, Gift, Users } from 'lucide-react';
import {
  fetchReferralLeaderboard,
  type PlayerAuthHandle,
  type ReferralLeaderboardEntry
} from '../lib/api';
import { localizeServerText, useLanguage } from '../lib/i18n';

const REFERRAL_PRIZE_TIERS = [
  {
    rank: 1,
    enLabel: 'Top 1',
    bnLabel: '১ম স্থান',
    enAmount: '600 Taka',
    bnAmount: '৬০০ টাকা',
    cardClass: 'from-amber-500/25 via-slate-900 to-slate-900 border-amber-400/50',
    labelClass: 'text-amber-300',
    crownClass: 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]'
  },
  {
    rank: 2,
    enLabel: 'Top 2',
    bnLabel: '২য় স্থান',
    enAmount: '400 Taka',
    bnAmount: '৪০০ টাকা',
    cardClass: 'from-slate-300/20 via-slate-900 to-slate-900 border-slate-300/40',
    labelClass: 'text-slate-200',
    crownClass: 'text-slate-200 drop-shadow-[0_0_8px_rgba(226,232,240,0.45)]'
  },
  {
    rank: 3,
    enLabel: 'Top 3',
    bnLabel: '৩য় স্থান',
    enAmount: '300 Taka',
    bnAmount: '৩০০ টাকা',
    cardClass: 'from-orange-500/20 via-slate-900 to-slate-900 border-orange-400/45',
    labelClass: 'text-orange-300',
    crownClass: 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]'
  }
] as const;

function formatDhakaMonthDisplay(lang: 'en' | 'bn', monthKey?: string): string {
  const fallback = new Date();
  let targetDate = fallback;
  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    const [y, m] = monthKey.split('-').map(Number);
    targetDate = new Date(Date.UTC(y, m - 1, 15, 6, 0, 0));
  }
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'bn-BD', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Dhaka'
  }).format(targetDate);
}

export function ReferralLeaderboardSection({
  currentUid,
  authHandle,
  isBanned = false,
  onOpenInvite,
  onBack
}: {
  currentUid?: string;
  authHandle?: PlayerAuthHandle | null;
  isBanned?: boolean;
  onOpenInvite?: () => void;
  onBack?: () => void;
}) {
  const { lang, t } = useLanguage();
  const [entries, setEntries] = useState<ReferralLeaderboardEntry[]>([]);
  const [monthKey, setMonthKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isBanned) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchReferralLeaderboard(authHandle)
      .then((data) => {
        if (!active) return;
        setEntries(data.top || []);
        setMonthKey(data.monthKey || '');
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : undefined;
        setError(localizeServerText(msg, lang, 'Could not load referral leaderboard.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authHandle, isBanned, lang]);

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
              'The admin has blocked your account. You cannot view the referral leaderboard right now.',
              'অ্যাডমিন আপনার অ্যাকাউন্ট ব্লক করেছেন। আপনি এই মুহূর্তে রেফার লিডারবোর্ড দেখতে পারবেন না।'
            )}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('Back to Games', 'গেমসে ফিরে যান')}</span>
        </button>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {formatDhakaMonthDisplay(lang, monthKey)} ·{' '}
              {t('Resets 1st day of month at 12:00 AM', 'প্রতি মাসের ১ তারিখ রাত ১২:০০ টায় রিসেট')}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            {t('Monthly Referral Leaderboard', 'মাসিক রেফার লিডারবোর্ড')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'Top 3 inviters this month win 600, 400 & 300 Taka! Plus +50 pts per friend (+30 pts for your friend).',
              'এই মাসে সবচেয়ে বেশি সফল রেফার করা শীর্ষ ৩ জন পাবেন ৬০০, ৪০০ ও ৩০০ টাকা! সাথে প্রতি রেফারে +৫০ পয়েন্ট (+৩০ পয়েন্ট নতুন বন্ধুর জন্য)।'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {onOpenInvite && (
            <button
              type="button"
              onClick={onOpenInvite}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Users className="w-4 h-4" />
              <span>{t('Invite Friends', 'বন্ধুদের ইনভাইট করুন')}</span>
            </button>
          )}
          <div className="bg-amber-500/15 border border-amber-400/40 rounded-2xl px-4 py-2 flex items-center gap-2.5">
            <Crown className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[11px] text-amber-200/90 font-medium">
                {t('Referral Prize Pool', 'রেফার পুরস্কার পুল')}
              </div>
              <div className="text-sm font-extrabold font-mono-tabular text-amber-300">
                {t('1,300 Taka / month', '১,৩০০ টাকা / মাস')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Referral Prize Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {REFERRAL_PRIZE_TIERS.map((tier) => {
          const leader = entries.find((r) => r.rank === tier.rank);
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
                  <div className="text-2xl font-extrabold font-mono-tabular text-white mt-0.5">
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
                          {leader.referralCode}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold font-mono-tabular text-emerald-400">
                        {leader.monthlyReferrals} {t('refs', 'জন')}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400">
                    {loading
                      ? t('Loading...', 'লোড হচ্ছে...')
                      : t('Empty spot — invite friends to claim!', 'এখনো কেউ নেই — ইনভাইট করে স্থান দখল করুন!')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Referral Ranking List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-400" />
            <span>{t('This Month Referral Rankings', 'এই মাসের রেফার র‍্যাংকিং')}</span>
          </div>
          <span className="text-xs text-slate-400">
            {t('Successful referrals this month', 'এই মাসের সফল রেফারেল')}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {t('Loading referral leaderboard...', 'রেফার লিডারবোর্ড লোড হচ্ছে...')}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-400">{error}</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="text-sm text-slate-400">
              {t(
                'No referrals recorded yet this month. Share your referral code to take #1!',
                'এই মাসে এখনো কোনো রেফারেল হয়নি। আপনার কোড শেয়ার করে ১ম স্থান দখল করুন!'
              )}
            </div>
            {onOpenInvite && (
              <button
                type="button"
                onClick={onOpenInvite}
                className="min-h-[42px] px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
              >
                <Users className="w-4 h-4" />
                <span>{t('Invite Friends', 'বন্ধুদের ইনভাইট করুন')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {entries.map((row) => {
              const isMe = currentUid === row.uid;
              const tier = REFERRAL_PRIZE_TIERS.find((p) => p.rank === row.rank);
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
                        {t('Referral Code:', 'রেফার কোড:')}{' '}
                        <span className="font-mono-tabular text-emerald-300 font-semibold">
                          {row.referralCode}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono-tabular font-bold text-emerald-400 text-base">
                      {row.monthlyReferrals} {t('referrals', 'জন')}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-tabular">
                      +{row.monthlyReferralEarnings} {t('pts', 'পয়েন্ট')}
                    </div>
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
