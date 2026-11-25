import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ban, Mail, MessageSquare, Send, ShieldCheck, Users } from 'lucide-react';
import { GAMES_CATALOG } from '../data/gamesCatalog';
import { fetchPlayerChat, sendPlayerChat, type ChatMessageItem, type PlayerAuthHandle } from '../lib/api';
import { localizeServerText, useLanguage } from '../lib/i18n';
import { FacebookPillButton } from './FacebookButton';

interface ChatSectionProps {
  authHandle: PlayerAuthHandle | null;
  isBanned?: boolean;
  onRequestLogin: () => void;
}

const ADMIN_TOPICS = [
  { key: 'Problem', en: 'Problem / Bug', bn: 'সমস্যা / বাগ' },
  { key: 'Payment Issue', en: 'Payment Issue', bn: 'পেমেন্ট সমস্যা' },
  { key: 'Cheating Report', en: 'Cheating Report', bn: 'চিটিং রিপোর্ট' },
  { key: 'Prize Inquiry', en: 'Prize Inquiry', bn: 'পুরস্কার জিজ্ঞাসা' },
  { key: 'General', en: 'General', bn: 'সাধারণ' }
] as const;

export function ChatSection({ authHandle, isBanned: isBannedProp = false, onRequestLogin }: ChatSectionProps) {
  const { lang, t } = useLanguage();
  const [channel, setChannel] = useState<'direct' | 'community'>('direct');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isBannedServer, setIsBannedServer] = useState(false);
  const [text, setText] = useState('');
  const [adminTopic, setAdminTopic] = useState<string>('Problem');
  const [gameTag, setGameTag] = useState('General');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isBanned = isBannedProp || isBannedServer;

  const loadMessages = useCallback(async () => {
    if (!authHandle) return;
    try {
      const res = await fetchPlayerChat(authHandle);
      setMessages(res.isBanned ? [] : res.messages || []);
      setIsBannedServer(Boolean(res.isBanned));
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(localizeServerText(msg, lang, 'Could not load messages.'));
    } finally {
      setLoading(false);
    }
  }, [authHandle, lang]);

  useEffect(() => {
    if (!authHandle) {
      setMessages([]);
      return;
    }
    setLoading(true);
    void loadMessages();
    const timer = window.setInterval(() => {
      void loadMessages();
    }, 3500);
    return () => window.clearInterval(timer);
  }, [authHandle, loadMessages]);

  const visibleMessages = isBanned ? [] : messages.filter((m) => m.channel === channel);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages.length, channel]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authHandle || !text.trim() || sending || isBanned) return;
    setSending(true);
    setError(null);
    try {
      await sendPlayerChat(authHandle, {
        channel,
        text: text.trim(),
        gameTag: channel === 'community' ? gameTag : adminTopic
      });
      setText('');
      await loadMessages();
    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(localizeServerText(msg, lang, 'Could not send message.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-400" />{' '}
            {t('Message Admin & Support', 'অ্যাডমিনকে মেসেজ ও সাপোর্ট')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'Message the admin directly about Problems, Payment Issues, Cheating Reports, or Monthly Prizes.',
              'যেকোনো সমস্যা, পেমেন্ট ইস্যু, চিটিং রিপোর্ট বা মাসিক পুরস্কারের জন্য সরাসরি অ্যাডমিনকে মেসেজ দিন।'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FacebookPillButton compact />
          {authHandle && !isBanned && (
            <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setChannel('direct')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  channel === 'direct' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> {t('Message Admin', 'অ্যাডমিনকে মেসেজ')}
              </button>
              <button
                type="button"
                onClick={() => setChannel('community')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  channel === 'community' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> {t('Players Chat', 'প্লেয়ার চ্যাট')}
              </button>
            </div>
          )}
        </div>
      </div>

      {!authHandle ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-sm text-slate-300">
            {t(
              'Connect with your Gmail in 1 click to message the admin directly about problems, payment issues, or cheating reports.',
              'সমস্যা, পেমেন্ট ইস্যু বা চিটিং রিপোর্টের জন্য অ্যাডমিনকে মেসেজ দিতে ১ ক্লিকে জিমেইল লগইন করুন।'
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRequestLogin}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
            >
              {t('Login with Gmail', 'জিমেইল দিয়ে লগইন')}
            </button>
            <FacebookPillButton />
          </div>
        </div>
      ) : isBanned ? (
        <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto">
            <Ban className="w-6 h-6 text-rose-400" />
          </div>
          <h3 className="text-lg font-bold text-white">{t('Messaging Disabled', 'মেসেজ সুবিধা বন্ধ')}</h3>
          <p className="text-sm text-rose-200">
            {t(
              'The admin has blocked your account. You cannot view or send messages.',
              'অ্যাডমিন আপনার অ্যাকাউন্ট ব্লক করেছেন। আপনি মেসেজ দেখতে বা পাঠাতে পারবেন না।'
            )}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[520px]">
          {channel === 'direct' && (
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">
                {t('Topic:', 'বিষয়:')}
              </span>
              {ADMIN_TOPICS.map((topic) => (
                <button
                  key={topic.key}
                  type="button"
                  onClick={() => setAdminTopic(topic.key)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                    adminTopic === topic.key
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {lang === 'en' ? topic.en : topic.bn}
                </button>
              ))}
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && visibleMessages.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-12">
                {t('Loading messages...', 'মেসেজ লোড হচ্ছে...')}
              </div>
            ) : visibleMessages.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-12">
                {channel === 'direct'
                  ? t(
                      'Select a topic above and send your message directly to the Admin!',
                      'উপর থেকে বিষয় নির্বাচন করে সরাসরি অ্যাডমিনকে আপনার মেসেজ পাঠান!'
                    )
                  : t(
                      'Send the first message to start chatting with players!',
                      'প্রথম মেসেজ পাঠিয়ে প্লেয়ারদের সাথে চ্যাট শুরু করুন!'
                    )}
              </div>
            ) : (
              visibleMessages.map((m) => {
                const mine = m.senderUid === authHandle.user.uid;
                const isFromAdmin = m.senderRole === 'admin';
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[84%] rounded-2xl px-4 py-2.5 text-sm ${
                        isFromAdmin
                          ? 'bg-amber-500/15 border border-amber-400/35 text-amber-50'
                          : mine
                          ? 'bg-emerald-500/20 border border-emerald-500/30 text-slate-100'
                          : 'bg-slate-950 border border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                        <span
                          className={`font-semibold ${
                            isFromAdmin ? 'text-amber-300' : 'text-emerald-300'
                          }`}
                        >
                          {isFromAdmin ? t('Admin · PLAY & WIN BD', 'অ্যাডমিন · PLAY & WIN BD') : m.senderName}
                        </span>
                        {m.gameTag && !isFromAdmin && <span>· {m.gameTag}</span>}
                      </div>
                      <p className="break-words leading-relaxed">{m.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {error && (
            <div className="px-4 py-2 bg-rose-500/15 border-t border-rose-500/30 text-xs text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap sm:flex-nowrap gap-2">
            {channel === 'community' && (
              <select
                value={gameTag}
                onChange={(e) => setGameTag(e.target.value)}
                disabled={isBanned}
                className="min-h-[44px] px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none"
              >
                <option value={t('General', 'সাধারণ')}>{t('General', 'সাধারণ')}</option>
                {GAMES_CATALOG.map((g) => {
                  const title = lang === 'en' ? g.title : g.bnTitle;
                  return (
                    <option key={g.id} value={title}>
                      {title}
                    </option>
                  );
                })}
              </select>
            )}
            <input
              type="text"
              value={text}
              maxLength={400}
              disabled={isBanned}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isBanned
                  ? t('Your messaging access is blocked', 'আপনার মেসেজ সুবিধা ব্লক করা হয়েছে')
                  : channel === 'direct'
                  ? t(`Describe your ${adminTopic.toLowerCase()} for the admin...`, `অ্যাডমিনের কাছে আপনার বার্তা লিখুন...`)
                  : t('Write your message...', 'আপনার বার্তা লিখুন...')
              }
              className="flex-1 min-w-[180px] min-h-[44px] px-4 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-emerald-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !text.trim() || isBanned}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              <Send className="w-4 h-4" /> {t('Send', 'পাঠান')}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
