import React, { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  Calendar,
  Check,
  LogOut,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldBan,
  Sliders,
  Trophy,
  Users,
  X
} from 'lucide-react';
import { GAMES_BY_ID, GAMES_CATALOG, type GameId } from '../data/gamesCatalog';
import {
  adminActionOnUser,
  adminBlockMessage,
  adminResetLeaderboard,
  clearAdminSession,
  fetchAdminChat,
  fetchAdminOverview,
  sendAdminChat,
  updateAdminSettings,
  type ChatMessageItem
} from '../lib/api';
import { formatSeasonDisplay, localizeServerText, useLanguage } from '../lib/i18n';
import { FacebookIconButton } from './FacebookButton';

type AdminTab = 'overview' | 'chat' | 'users' | 'blocked';

function formatJoinTime(iso: string | undefined, lang: 'en' | 'bn'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dhaka'
  }).format(d);
}

export function AdminPanel({
  onProfileUpdated,
  onAdminLogout
}: {
  onProfileUpdated: () => Promise<void>;
  onAdminLogout: () => void;
}) {
  const { lang, t } = useLanguage();
  const [adminTab, setAdminTab] = useState<AdminTab>('users');
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminOverview>> | null>(null);
  const [chatData, setChatData] = useState<Awaited<ReturnType<typeof fetchAdminChat>> | null>(null);
  const [selectedThread, setSelectedThread] = useState<'community' | string>('community');
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [cooldownInput, setCooldownInput] = useState(1000);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetchAdminOverview();
      setData(res);
      setCooldownInput(res.settings.globalCooldownMs);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(localizeServerText(msg, lang, 'Could not load admin data.'));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  const loadChat = useCallback(async () => {
    try {
      const res = await fetchAdminChat();
      setChatData(res);
    } catch {
      // ignore transient poll errors
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadOverview();
    void loadChat();
  }, [loadOverview, loadChat]);

  useEffect(() => {
    if (adminTab !== 'chat') return;
    const timer = window.setInterval(() => {
      void loadChat();
    }, 3500);
    return () => window.clearInterval(timer);
  }, [adminTab, loadChat]);

  if (loading && !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-slate-400">
        {t('Loading admin panel...', 'অ্যাডমিন প্যানেল লোড হচ্ছে...')}
      </div>
    );
  }

  if (error || !data) {
    return <div className="max-w-6xl mx-auto px-4 py-12 text-center text-rose-400">{error}</div>;
  }

  const toggleGame = async (id: GameId) => {
    const disabled = new Set(data.settings.disabledGames);
    if (disabled.has(id)) disabled.delete(id);
    else disabled.add(id);
    await updateAdminSettings({ disabledGames: Array.from(disabled) });
    await loadOverview();
    await onProfileUpdated();
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAdminSettings({
      dailyPointLimit: 1000000,
      globalCooldownMs: Number(cooldownInput)
    });
    setBanner({ ok: true, text: t('Settings saved.', 'সেটিংস সংরক্ষণ করা হয়েছে।') });
    await loadOverview();
    await onProfileUpdated();
  };

  const handleOneClickReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      const res = await adminResetLeaderboard();
      setBanner({
        ok: true,
        text: t(
          `1-Click reset complete! ${res.resetUsersCount} player scores reset to 0 and Season #${res.seasonNumber} started.`,
          `১-ক্লিক রিসেট সম্পন্ন! ${res.resetUsersCount} জন প্লেয়ারের স্কোর ০ করা হয়েছে এবং সিজন #${res.seasonNumber} শুরু হয়েছে।`
        )
      });
      await Promise.all([loadOverview(), loadChat(), onProfileUpdated()]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      setBanner({ ok: false, text: localizeServerText(msg, lang, 'Reset failed.') });
    } finally {
      setResetting(false);
    }
  };

  const openChatWithPlayer = (uid: string) => {
    setSelectedThread(uid);
    setAdminTab('chat');
    void loadChat();
  };

  const handleSendAdminChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;
    setSendingChat(true);
    try {
      await sendAdminChat({
        channel: selectedThread === 'community' ? 'community' : 'direct',
        targetUid: selectedThread === 'community' ? undefined : selectedThread,
        text: chatInput.trim()
      });
      setChatInput('');
      await loadChat();
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      setBanner({ ok: false, text: localizeServerText(msg, lang, 'Could not send message.') });
    } finally {
      setSendingChat(false);
    }
  };

  const handleToggleMessageBlock = async (msg: ChatMessageItem) => {
    const nextBlocked = !msg.blocked;
    setBusyKey(`msg_${msg.id}`);
    try {
      await adminBlockMessage(msg.id, nextBlocked);
      setChatData((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) => (m.id === msg.id ? { ...m, blocked: nextBlocked } : m))
            }
          : prev
      );
      setBanner({
        ok: true,
        text: nextBlocked
          ? t('This message has been blocked.', 'এই মেসেজটি ব্লক করা হয়েছে।')
          : t('Message unblocked.', 'মেসেজটি আনব্লক করা হয়েছে।')
      });
      await loadChat();
    } catch (err) {
      const msgErr = err instanceof Error ? err.message : undefined;
      setBanner({ ok: false, text: localizeServerText(msgErr, lang, 'Could not update message block status.') });
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleUserBlock = async (uid: string, currentlyBanned: boolean, displayName?: string) => {
    const nextBanned = !currentlyBanned;
    setBusyKey(`user_${uid}`);
    try {
      await adminActionOnUser(uid, { type: currentlyBanned ? 'unban' : 'ban' });
      setData((prev) =>
        prev
          ? {
              ...prev,
              users: prev.users.map((u) => (u.uid === uid ? { ...u, isBanned: nextBanned } : u))
            }
          : prev
      );
      setChatData((prev) =>
        prev
          ? {
              ...prev,
              players: prev.players.map((p) => (p.uid === uid ? { ...p, isBanned: nextBanned } : p))
            }
          : prev
      );
      setBanner({
        ok: true,
        text: nextBanned
          ? `${displayName || t('User', 'ইউজার')} ${t('has been blocked.', 'ব্লক করা হয়েছে।')}`
          : `${displayName || t('User', 'ইউজার')} ${t('has been unblocked.', 'আনব্লক করা হয়েছে।')}`
      });
      await Promise.all([loadOverview(), loadChat(), onProfileUpdated()]);
    } catch (err) {
      const msgErr = err instanceof Error ? err.message : undefined;
      setBanner({ ok: false, text: localizeServerText(msgErr, lang, 'Could not update user block status.') });
    } finally {
      setBusyKey(null);
    }
  };

  const blockedUsers = data.users.filter((u) => u.isBanned);
  const topThree = data.leaderboardTop.slice(0, 3);
  const prizeTiers = [3000, 2500, 2000];

  const threadMessages = (chatData?.messages || []).filter((m) =>
    selectedThread === 'community'
      ? m.channel === 'community'
      : m.channel === 'direct' && m.threadUid === selectedThread
  );

  const selectedPlayer =
    selectedThread !== 'community'
      ? chatData?.players.find((p) => p.uid === selectedThread) || null
      : null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {formatSeasonDisplay(
                lang,
                data.settings.seasonNumber,
                data.settings.seasonStartedAt,
                data.settings.seasonLabel
              )}{' '}
              · {t('1st–7th Cycle', '১–৭ তারিখ চক্র')}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
            <Sliders className="w-6 h-6 text-emerald-400" /> {t('Admin Dashboard', 'অ্যাডমিন ড্যাশবোর্ড')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'View registered users (Name, Gmail, Join Time, Points), reply to support messages, and reset the 1st–7th leaderboard.',
              'নিবন্ধিত ইউজারদের তালিকা (নাম, জিমেইল, জয়েন টাইম, পয়েন্ট), সাপোর্ট মেসেজের উত্তর এবং ১–৭ তারিখ লিডারবোর্ড নিয়ন্ত্রণ করুন।'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <FacebookIconButton />
          <button
            type="button"
            onClick={() => {
              clearAdminSession();
              onAdminLogout();
            }}
            className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" /> {t('Admin Logout', 'অ্যাডমিন লগআউট')}
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`px-4 py-3 rounded-2xl border text-sm flex items-center justify-between gap-3 ${
            banner.ok
              ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/35 text-rose-200'
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="opacity-80 hover:opacity-100 shrink-0"
            aria-label={t('Close', 'বন্ধ করুন')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Sub-Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setAdminTab('users')}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
            adminTab === 'users'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> {t('Users List', 'ইউজার তালিকা')} ({data.users.length})
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('overview')}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
            adminTab === 'overview'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" /> {t('Prizes & Reset', 'পুরস্কার ও রিসেট')}
        </button>
        <button
          type="button"
          onClick={() => {
            setAdminTab('chat');
            void loadChat();
          }}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
            adminTab === 'chat'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> {t('User Messages', 'ইউজারের মেসেজ')}
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('blocked')}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
            adminTab === 'blocked'
              ? 'bg-rose-500 text-white'
              : 'bg-slate-900 text-rose-300 border border-rose-500/30 hover:bg-slate-800'
          }`}
        >
          <Ban className="w-4 h-4" /> {t('Blocked Users', 'ব্লক করা ইউজার')} ({blockedUsers.length})
        </button>
      </div>

      {/* TAB 1: USERS LIST (Name, Gmail, Join Time, Points) */}
      {adminTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 overflow-x-auto">
          <h3 className="text-base font-bold text-white">
            {t('Registered Users (Name · Gmail · Join Time · Points)', 'নিবন্ধিত ইউজার (নাম · জিমেইল · জয়েন টাইম · পয়েন্ট)')} ({data.users.length})
          </h3>
          {data.users.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              {t('No registered users yet.', 'এখনো কোনো নিবন্ধিত ইউজার নেই।')}
            </p>
          ) : (
            <table className="w-full text-left text-xs min-w-[820px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-3">{t('Name', 'নাম')}</th>
                  <th className="py-2.5 pr-3">{t('Gmail', 'জিমেইল')}</th>
                  <th className="py-2.5 pr-3">{t('Join Time', 'জয়েন টাইম')}</th>
                  <th className="py-2.5 pr-3">{t('Points', 'পয়েন্ট')}</th>
                  <th className="py-2.5 pr-3">{t('Matches', 'ম্যাচ')}</th>
                  <th className="py-2.5 text-right">{t('Actions', 'অ্যাকশন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {data.users.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{u.displayName}</span>
                        {u.isBanned && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                            {t('Blocked', 'ব্লকড')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-slate-300 font-medium">{u.email || '—'}</td>
                    <td className="py-3 pr-3 text-slate-400 font-mono-tabular whitespace-nowrap">
                      {formatJoinTime(u.createdAt, lang)}
                    </td>
                    <td className="py-3 pr-3 font-mono-tabular text-emerald-400 font-extrabold text-sm">
                      {u.monthlyPoints ?? u.rewardPoints}
                    </td>
                    <td className="py-3 pr-3 font-mono-tabular text-slate-300">
                      {u.monthlyGamesPlayed ?? u.totalGamesPlayed}
                    </td>
                    <td className="py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openChatWithPlayer(u.uid)}
                        className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 inline-flex items-center gap-1 font-semibold"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> {t('Message', 'মেসেজ')}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminActionOnUser(u.uid, { type: 'adjustPoints', pointsDelta: 50 });
                          await loadOverview();
                        }}
                        className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold"
                      >
                        {t('+50 pts', '+৫০ পয়েন্ট')}
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `user_${u.uid}`}
                        onClick={() => void handleToggleUserBlock(u.uid, u.isBanned, u.displayName)}
                        className={`px-3 py-2 rounded-lg inline-flex items-center gap-1 font-bold transition-colors disabled:opacity-50 ${
                          u.isBanned
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            : 'bg-rose-500 hover:bg-rose-400 text-white'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />{' '}
                        {u.isBanned ? t('Unblock', 'আনব্লক') : t('Block', 'ব্লক')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: OVERVIEW, TOP 3 WINNERS + 1-CLICK LEADERBOARD RESET */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-rose-500/15 via-slate-900 to-slate-900 border border-rose-500/35 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-rose-300">
                {t('Monthly 1st–7th Cycle Reset', 'প্রতি মাসের ১–৭ তারিখ সিজন রিসেট')}
              </div>
              <h3 className="text-lg font-extrabold text-white">
                {t('1-Click Leaderboard Reset', '১-ক্লিক লিডারবোর্ড রিসেট')}
              </h3>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                {t(
                  'After sending prizes to Top 3 winners on the 7th (1st: 3,000 Taka, 2nd: 2,500 Taka, 3rd: 2,000 Taka — Total 7,500 Taka), click here to reset all scores to 0.',
                  '৭ তারিখে শীর্ষ ৩ বিজয়ীকে পুরস্কার (১ম: ৩,০০০, ২য়: ২,৫০০, ৩য়: ২,০০০ টাকা — মোট ৭,৫০০ টাকা) দেওয়ার পর সকল স্কোর ০ করতে চাপুন।'
                )}
              </p>
            </div>
            <button
              type="button"
              disabled={resetting}
              onClick={() => void handleOneClickReset()}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {resetting
                  ? t('Resetting...', 'রিসেট হচ্ছে...')
                  : t('1-Click Leaderboard Reset (Score 0)', '১-ক্লিক লিডারবোর্ড রিসেট (স্কোর ০)')}
              </span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />{' '}
              {t('Current Top 3 Winners (3,000 / 2,500 / 2,000 Taka)', 'চলতি মাসের শীর্ষ ৩ বিজয়ী (৩,০০০ / ২,৫০০ / ২,০০০ টাকা)')}
            </h3>
            {topThree.length === 0 ? (
              <p className="text-sm text-slate-400">
                {t('No players have scored yet this round.', 'এই রাউন্ডে এখনো কোনো প্লেয়ার স্কোর করেনি।')}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {topThree.map((winner, idx) => (
                  <div
                    key={winner.uid}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">
                        #{winner.rank} · {prizeTiers[idx]?.toLocaleString('en-US')} {t('Taka', 'টাকা')}
                      </span>
                      <span className="text-xs font-mono-tabular text-emerald-400 font-bold">
                        {winner.monthlyPoints} {t('pts', 'পয়েন্ট')}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-white truncate">{winner.displayName}</div>
                      <div className="text-xs text-slate-400">
                        {t('Matches:', 'ম্যাচ:')} {winner.monthlyGamesPlayed}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openChatWithPlayer(winner.uid)}
                      className="w-full min-h-[40px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> {t('Message Winner', 'বিজয়ীকে মেসেজ দিন')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={saveSettings} className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-base font-bold text-white">
                {t('Unlimited Play & Anti-Cheat Settings', 'আনলিমিটেড খেলা ও অ্যান্টি-চিট সেটিংস')}
              </h3>
              <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-semibold">
                {t('Unlimited Play is active (No daily point limit).', 'আনলিমিটেড খেলা চালু আছে (কোনো দৈনিক পয়েন্ট সীমা নেই)।')}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {t('Submission Cooldown (ms)', 'সাবমিশন কুলডাউন (মিলিসেকেন্ড)')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={60000}
                  value={cooldownInput}
                  onChange={(e) => setCooldownInput(Number(e.target.value))}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-tabular text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
              >
                {t('Save Settings', 'সেটিংস সংরক্ষণ করুন')}
              </button>
            </form>

            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-base font-bold text-white">
                {t('12 Games On / Off Control', '১২টি গেম চালু বা বন্ধ নিয়ন্ত্রণ')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GAMES_CATALOG.map((g) => {
                  const disabled = data.settings.disabledGames.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGame(g.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-colors ${
                        disabled
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      <div className="truncate">{lang === 'en' ? g.title : g.bnTitle}</div>
                      <div className="text-[10px] opacity-80">
                        {disabled ? t('Disabled', 'বন্ধ আছে') : t('Active', 'চালু আছে')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />{' '}
              {t('Anti-Cheat Flag Logs', 'অ্যান্টি-চিট ফ্ল্যাগ লগ')} ({data.cheatLogs.length})
            </h3>
            {data.cheatLogs.length === 0 ? (
              <p className="text-sm text-slate-400">
                {t('No suspicious activity detected yet.', 'এখনো কোনো সন্দেহজনক কার্যক্রম শনাক্ত হয়নি।')}
              </p>
            ) : (
              <div className="divide-y divide-slate-800 text-xs">
                {data.cheatLogs.map((c) => {
                  const meta = GAMES_BY_ID[c.gameId];
                  const gName = meta ? (lang === 'en' ? meta.title : meta.bnTitle) : c.gameId;
                  return (
                    <div key={c.id} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-semibold text-white">{c.email}</span> ·{' '}
                        <span className="text-amber-300">{gName}</span>
                        <div className="text-rose-400 mt-0.5">{c.reason}</div>
                      </div>
                      <div className="text-right font-mono-tabular text-slate-400">
                        <div>
                          {t('Score:', 'স্কোর:')} {c.reportedScore}
                        </div>
                        <div>
                          {t('Time:', 'সময়:')} {Math.round(c.durationMs / 1000)}s
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: USER MESSAGES & SUPPORT */}
      {adminTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 max-h-[560px] overflow-y-auto">
            <div className="text-xs font-bold text-slate-400">
              {t('Support Inbox & Players', 'সাপোর্ট ইনবক্স ও প্লেয়ার')}
            </div>

            <button
              type="button"
              onClick={() => setSelectedThread('community')}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                selectedThread === 'community'
                  ? 'bg-emerald-500/15 border-emerald-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-sm font-bold">{t('Community Chat (All)', 'কমিউনিটি চ্যাট (সবাই)')}</div>
                <div className="text-[11px] text-slate-400">
                  {t('Public messages & moderation', 'পাবলিক মেসেজ ও মডারেশন')}
                </div>
              </div>
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            </button>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              {(chatData?.players || []).length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  {t('No registered players yet.', 'এখনো কোনো নিবন্ধিত প্লেয়ার নেই।')}
                </div>
              ) : (
                chatData!.players.map((p) => (
                  <button
                    key={p.uid}
                    type="button"
                    onClick={() => setSelectedThread(p.uid)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors ${
                      selectedThread === p.uid
                        ? 'bg-emerald-500/15 border-emerald-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        {p.rank ? <span className="text-amber-300 font-mono-tabular">#{p.rank}</span> : null}
                        <span className="truncate">{p.displayName}</span>
                        {p.isBanned && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                            {t('Blocked', 'ব্লকড')}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{p.email}</div>
                    </div>
                    <div className="text-right shrink-0 font-mono-tabular text-[11px] text-emerald-400">
                      {p.monthlyPoints} pts
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[560px]">
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>
                    {selectedPlayer
                      ? `${selectedPlayer.displayName} ${selectedPlayer.rank ? `(#${selectedPlayer.rank})` : ''}`
                      : t('Community Chat', 'কমিউনিটি চ্যাট')}
                  </span>
                  {selectedPlayer?.isBanned && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold">
                      {t('Blocked', 'ব্লকড')}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {selectedPlayer
                    ? `${selectedPlayer.email} · ${selectedPlayer.monthlyPoints} ${t('monthly pts', 'মাসিক পয়েন্ট')}`
                    : t('Reply to user reports or announcements', 'ইউজার রিপোর্ট বা ঘোষণায় উত্তর দিন')}
                </div>
              </div>

              {selectedPlayer && (
                <button
                  type="button"
                  disabled={busyKey === `user_${selectedPlayer.uid}`}
                  onClick={() =>
                    void handleToggleUserBlock(
                      selectedPlayer.uid,
                      selectedPlayer.isBanned,
                      selectedPlayer.displayName
                    )
                  }
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                    selectedPlayer.isBanned
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-rose-500 hover:bg-rose-400 text-white'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  {selectedPlayer.isBanned ? t('Unblock', 'আনব্লক করুন') : t('Block User', 'ইউজার ব্লক করুন')}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {threadMessages.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-14">
                  {t('No messages in this thread yet.', 'এই থ্রেডে এখনো কোনো মেসেজ নেই।')}
                </div>
              ) : (
                threadMessages.map((m) => {
                  const isAdm = m.senderRole === 'admin';
                  return (
                    <div key={m.id} className={`flex flex-col ${isAdm ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm border ${
                          m.blocked
                            ? 'bg-rose-950/40 border-rose-500/45 text-rose-200'
                            : isAdm
                            ? 'bg-emerald-500/20 border-emerald-500/35 text-slate-100'
                            : 'bg-slate-950 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 mb-1">
                          <span className={`font-semibold ${isAdm ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {m.senderName}
                            {m.gameTag && !isAdm ? ` · [${m.gameTag}]` : ''}
                          </span>
                          <button
                            type="button"
                            disabled={busyKey === `msg_${m.id}`}
                            onClick={() => void handleToggleMessageBlock(m)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50 ${
                              m.blocked
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                : 'bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 border border-rose-500/40'
                            }`}
                          >
                            <ShieldBan className="w-3 h-3" />
                            {m.blocked ? t('Unblock', 'আনব্লক করুন') : t('Block Message', 'মেসেজ ব্লক')}
                          </button>
                        </div>

                        {m.blocked ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-rose-300">
                              {t('This message has been blocked', 'এই মেসেজটি ব্লক করা হয়েছে')}
                            </div>
                            <div className="text-xs text-slate-400 line-through break-words">
                              {t('Original (Admin only):', 'মূল বার্তা (শুধু অ্যাডমিন দেখতে পারবেন):')} {m.text}
                            </div>
                          </div>
                        ) : (
                          <p className="break-words">{m.text}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendAdminChat} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                maxLength={400}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  selectedPlayer
                    ? t(`Reply to ${selectedPlayer.displayName}...`, `${selectedPlayer.displayName}-কে উত্তর লিখুন...`)
                    : t('Write an announcement...', 'ঘোষণা লিখুন...')
                }
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                <Send className="w-4 h-4" /> {t('Send', 'পাঠান')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: BLOCKED USERS */}
      {adminTab === 'blocked' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Ban className="w-5 h-5 text-rose-400" /> {t('Blocked Users', 'ব্লক করা ইউজার')} ({blockedUsers.length})
          </h3>

          {blockedUsers.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              {t('No blocked users right now.', 'বর্তমানে কোনো ইউজার ব্লক করা নেই।')}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {blockedUsers.map((u) => (
                <div key={u.uid} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-xs font-bold text-rose-300 shrink-0">
                      {u.photoURL ? (
                        <img
                          src={u.photoURL}
                          alt={u.displayName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        u.displayName.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span className="truncate">{u.displayName}</span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                          {t('Blocked', 'ব্লকড')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {u.email || '—'} · {t('Points:', 'পয়েন্ট:')} {u.monthlyPoints ?? u.rewardPoints} ·{' '}
                        {formatJoinTime(u.createdAt, lang)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busyKey === `user_${u.uid}`}
                    onClick={() => void handleToggleUserBlock(u.uid, true, u.displayName)}
                    className="min-h-[42px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Check className="w-4 h-4" /> {t('Unblock', 'আনব্লক করুন')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
