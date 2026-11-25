import React from 'react';
import { Calendar, CheckCircle2, Clock, Crown, Infinity as InfinityIcon, LogOut, MessageSquare, ShieldCheck } from 'lucide-react';
import { GAMES_BY_ID } from '../data/gamesCatalog';
import type { PlayerAuthHandle, UserProfileResponse } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { FacebookPillButton } from './FacebookButton';

interface RewardsSectionProps {
  authHandle: PlayerAuthHandle | null;
  profile: UserProfileResponse | null;
  onRequestLogin: () => void;
  onLogout: () => Promise<void>;
  onOpenMessageAdmin: () => void;
}

export function RewardsSection({
  authHandle,
  profile,
  onRequestLogin,
  onLogout,
  onOpenMessageAdmin
}: RewardsSectionProps) {
  const { lang, t } = useLanguage();

  const prizesBanner = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-amber-400/35 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Crown className="w-5 h-5 text-amber-400" />
          <span>{t('Monthly Cash Prizes (Top 3 Players)', 'মাসিক নগদ পুরস্কার (শীর্ষ ৩ প্লেয়ার)')}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
          <Calendar className="w-3.5 h-3.5" />
          <span>{t('1st – 7th of Every Month · Ends on 7th', 'প্রতি মাসের ১ – ৭ তারিখ · ৭ তারিখে শেষ')}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-400/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-300">{t('1st Place', '১ম স্থান')}</div>
            <div className="text-2xl font-extrabold font-mono-tabular text-white mt-0.5">
              {t('3,000 Taka Win', '৩,০০০ টাকা পুরস্কার')}
            </div>
          </div>
          <Crown className="w-8 h-8 text-amber-400 shrink-0" />
        </div>
        <div className="bg-gradient-to-br from-slate-300/15 via-slate-900 to-slate-900 border border-slate-400/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-200">{t('2nd Place', '২য় স্থান')}</div>
            <div className="text-2xl font-extrabold font-mono-tabular text-white mt-0.5">
              {t('2,500 Taka Win', '২,৫০০ টাকা পুরস্কার')}
            </div>
          </div>
          <Crown className="w-7 h-7 text-slate-300 shrink-0" />
        </div>
        <div className="bg-gradient-to-br from-orange-500/15 via-slate-900 to-slate-900 border border-orange-400/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-orange-300">{t('3rd Place', '৩য় স্থান')}</div>
            <div className="text-2xl font-extrabold font-mono-tabular text-white mt-0.5">
              {t('2,000 Taka Win', '২,০০০ টাকা পুরস্কার')}
            </div>
          </div>
          <Crown className="w-7 h-7 text-orange-400 shrink-0" />
        </div>
      </div>
    </div>
  );

  if (!authHandle) {
    return (
      <section className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {prizesBanner}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">{t('Player Account', 'প্লেয়ার অ্যাকাউন্ট')}</h2>
          <p className="text-sm text-slate-400">
            {t(
              'Connect with your Gmail in 1 click to save unlimited match points and track your live leaderboard ranking.',
              'আনলিমিটেড ম্যাচ পয়েন্ট ও লাইভ লিডারবোর্ড র‍্যাংকিং দেখতে ১ ক্লিকে জিমেইল দিয়ে লগইন করুন।'
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRequestLogin}
              className="min-h-[46px] px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
            >
              {t('Login with Gmail', 'জিমেইল দিয়ে লগইন')}
            </button>
            <FacebookPillButton />
          </div>
        </div>
      </section>
    );
  }

  const u = profile?.user;
  const displayName = u?.displayName || authHandle.user.displayName || 'Player';
  const email = u?.email || authHandle.user.email || '';
  const photoURL = u?.photoURL || authHandle.user.photoURL || '';

  return (
    <section className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Player Gmail Profile Header + Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 rounded-full bg-slate-800 border border-emerald-500/40 overflow-hidden flex items-center justify-center text-base font-extrabold text-emerald-300 shrink-0">
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              displayName.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">{displayName}</h2>
            <div className="text-xs text-slate-400 truncate">{email}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenMessageAdmin}
            className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t('Message Admin', 'অ্যাডমিনকে মেসেজ')}</span>
          </button>
          <FacebookPillButton compact />
          <button
            type="button"
            onClick={() => void onLogout()}
            className="min-h-[44px] px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-200 font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('Logout', 'লগআউট')}</span>
          </button>
        </div>
      </div>

      {prizesBanner}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs text-slate-400">{t('Current Monthly Points', 'চলতি মাসের পয়েন্ট')}</div>
          <div className="text-3xl font-bold font-mono-tabular text-emerald-400 mt-1">
            {u?.rewardPoints ?? 0}{' '}
            <span className="text-sm font-normal text-slate-400">{t('pts', 'পয়েন্ট')}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {t('Lifetime earned:', 'মোট লাইফটাইম অর্জন:')} {u?.lifetimePoints ?? 0} {t('pts', 'পয়েন্ট')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-3">
          <InfinityIcon className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-white">{t('Unlimited Play Active', 'আনলিমিটেড খেলা চালু')}</div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t(
                'No daily point limit! Play as many matches as you want during the 1st–7th round to win cash prizes.',
                'কোনো দৈনিক সীমা নেই! ১–৭ তারিখের মধ্যে যত খুশি খেলে শীর্ষ ৩-এ জায়গা করে নিন।'
              )}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-white">{t('Verified Live Ranking', 'ভেরিফায়েড লাইভ র‍্যাংকিং')}</div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t(
                'Every game match is server-verified automatically and added straight to the LIVE Leaderboard.',
                'প্রতিটি ম্যাচ সার্ভার থেকে যাচাই হয়ে সাথে সাথে লাইভ লিডারবোর্ডে যুক্ত হয়।'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Verified Matches */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />{' '}
          {t('Recent Matches', 'সাম্প্রতিক ম্যাচ')}
        </h3>

        {(profile?.history || []).length === 0 ? (
          <div className="text-sm text-slate-400 py-8 text-center">
            {t('You have not finished any matches yet.', 'আপনি এখনো কোনো ম্যাচ শেষ করেননি।')}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {profile!.history.map((h) => {
              const meta = GAMES_BY_ID[h.gameId];
              const gameName = meta ? (lang === 'en' ? meta.title : meta.bnTitle) : h.gameId;
              return (
                <div key={h.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <div className="font-semibold text-white">{gameName}</div>
                    <div className="text-xs text-slate-400">
                      {t('Score:', 'স্কোর:')}{' '}
                      <span className="font-mono-tabular text-slate-200">{h.score}</span> ·{' '}
                      {t('Time:', 'সময়:')}{' '}
                      <span className="font-mono-tabular">{Math.round(h.durationMs / 1000)}s</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {h.verified ? (
                      <div className="text-emerald-400 font-mono-tabular font-bold flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5" /> +{h.awardedPoints} pts
                      </div>
                    ) : (
                      <div className="text-rose-400 text-xs font-semibold">
                        {t('Rejected', 'বাতিল')} ({h.flagReason})
                      </div>
                    )}
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
