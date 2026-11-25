import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { createServer as createViteServer } from 'vite';
import { ADMIN_EMAIL, GAMES_BY_ID, type GameId } from './src/data/gamesCatalog.ts';
import { validateAndScoreSubmission } from './server/gameValidation.ts';
import {
  adminAdjustUser,
  adminDeleteSingleReferral,
  adminDeleteUserReferralCount,
  adminToggleBlockMessage,
  applyReferralCode,
  bootstrapAdminCredential,
  canUserClaimReferral,
  claimSessionDoubleReward,
  claimSessionRevive,
  createAdminToken,
  createGameSession,
  ensureUser,
  getAdminAuthStatus,
  getAdminChatOverview,
  getAdminSnapshot,
  getLeaderboardData,
  getReferralLeaderboardData,
  getSettings,
  getUserHistory,
  listChatMessagesForPlayer,
  resetMonthlyLeaderboard,
  resetMonthlyReferralLeaderboard,
  sendAdminChatMessage,
  sendPlayerChatMessage,
  updateSettings,
  verifyAdminLogin,
  verifyAdminToken,
  type ServerUserRecord
} from './server/store.ts';

// Verify Firebase ID tokens against the connected project (no IAM required)
let FIREBASE_PROJECT_ID = 'ageless-invention-10w9t';
try {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as { projectId?: string };
    if (cfg.projectId) FIREBASE_PROJECT_ID = cfg.projectId;
  }
} catch {
  // fallback to default project id
}
const adminApp = getApps().length ? getApp() : initializeApp({ projectId: FIREBASE_PROJECT_ID });
const adminAuth = getAuth(adminApp);

interface AuthenticatedRequest extends Request {
  firebaseUser?: DecodedIdToken;
  playerRecord?: ServerUserRecord;
}

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

async function requirePlayerAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'অনুগ্রহ করে আগে আপনার Gmail দিয়ে লগইন করুন।' });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'অবৈধ টোকেন।' });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email || decoded.email_verified !== true) {
      res.status(403).json({ error: 'ভেরিফায়েড Gmail / Google অ্যাকাউন্ট প্রয়োজন।' });
      return;
    }
    req.firebaseUser = decoded;
    req.playerRecord = ensureUser({
      uid: decoded.uid,
      email: decoded.email,
      displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
      photoURL: typeof decoded.picture === 'string' ? decoded.picture : undefined
    });
    next();
  } catch {
    res.status(401).json({ error: 'সেশন মেয়াদোত্তীর্ণ হয়েছে, পুনরায় Gmail দিয়ে লগইন করুন।' });
  }
}

function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'অ্যাডমিন লগইন প্রয়োজন।' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const verified = verifyAdminToken(token);
  if (!verified) {
    res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন প্রবেশ করতে পারবেন।' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.get('/api/leaderboard', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          if (decoded.email && decoded.email_verified === true) {
            const record = ensureUser({
              uid: decoded.uid,
              email: decoded.email,
              displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
              photoURL: typeof decoded.picture === 'string' ? decoded.picture : undefined
            });
            if (record.isBanned) {
              res.status(403).json({
                error: 'অ্যাডমিন আপনার অ্যাকাউন্ট ব্লক করেছেন। আপনি লিডারবোর্ড দেখতে পারবেন না।',
                blocked: true
              });
              return;
            }
          }
        } catch {
          // ignore invalid optional token on public leaderboard
        }
      }
    }

    const gameParam = typeof req.query.gameId === 'string' ? req.query.gameId : undefined;
    const validGame = gameParam && gameParam in GAMES_BY_ID ? (gameParam as GameId) : undefined;
    res.json({
      ...getLeaderboardData(validGame),
      settings: {
        dailyPointLimit: getSettings().dailyPointLimit,
        disabledGames: getSettings().disabledGames,
        maintenanceMode: getSettings().maintenanceMode,
        adSettings: getSettings().adSettings
      }
    });
  });

  app.get('/api/referral/leaderboard', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          if (decoded.email && decoded.email_verified === true) {
            const record = ensureUser({
              uid: decoded.uid,
              email: decoded.email,
              displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
              photoURL: typeof decoded.picture === 'string' ? decoded.picture : undefined
            });
            if (record.isBanned) {
              res.status(403).json({
                error: 'অ্যাডমিন আপনার অ্যাকাউন্ট ব্লক করেছেন। আপনি লিডারবোর্ড দেখতে পারবেন না।',
                blocked: true
              });
              return;
            }
          }
        } catch {
          // ignore invalid optional token on public referral leaderboard
        }
      }
    }

    res.json(getReferralLeaderboardData());
  });

  app.get('/api/me', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const record = req.playerRecord!;
    const settings = getSettings();
    res.json({
      user: {
        ...record,
        referralCode: record.referralCode,
        referredByCode: record.referredByCode || null,
        referralCountLifetime: record.referralCountLifetime || 0,
        referralEarningsLifetime: record.referralEarningsLifetime || 0,
        referralCountMonth: record.referralCountMonth || 0,
        referralEarningsMonth: record.referralEarningsMonth || 0,
        canClaimReferral: canUserClaimReferral(record),
        isAdmin: Boolean(record.email && record.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())
      },
      dailyLimit: settings.dailyPointLimit,
      dailyRemaining: Math.max(0, settings.dailyPointLimit - record.daily.pointsEarned),
      disabledGames: settings.disabledGames,
      maintenanceMode: settings.maintenanceMode,
      adSettings: settings.adSettings,
      history: getUserHistory(record.uid),
      redemptions: [],
      rewardPackages: []
    });
  });

  app.post('/api/referral/apply', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const record = req.playerRecord!;
    const rawCode = typeof req.body?.code === 'string' ? req.body.code : '';
    if (!rawCode.trim()) {
      res.status(400).json({ error: 'Invalid referral code.' });
      return;
    }
    const result = applyReferralCode(record, rawCode);
    if (!result.ok) {
      res.status(result.errorCode === 'BANNED' ? 403 : 400).json({
        error: result.error,
        errorCode: result.errorCode
      });
      return;
    }
    res.json({
      ok: true,
      referrerName: result.referrerName,
      referrerCode: result.referrerCode,
      newUserBonus: result.newUserBonus,
      referrerBonus: result.referrerBonus,
      rewardPoints: record.rewardPoints
    });
  });

  app.post('/api/games/session/start', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const gameId = req.body?.gameId as GameId;
    if (!gameId || !(gameId in GAMES_BY_ID)) {
      res.status(400).json({ error: 'অবৈধ গেম নির্বাচন।' });
      return;
    }

    const record = req.playerRecord!;
    if (record.isBanned) {
      res.status(403).json({ error: 'আপনার অ্যাকাউন্টটি স্থগিত করা হয়েছে।' });
      return;
    }

    const settings = getSettings();
    const isAdmin = Boolean(record.email && record.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (settings.maintenanceMode && !isAdmin) {
      res.status(503).json({ error: 'সাইটে রক্ষণাবেক্ষণ কাজ চলছে।' });
      return;
    }
    if (settings.disabledGames.includes(gameId)) {
      res.status(403).json({ error: 'এই গেমটি সাময়িকভাবে বন্ধ আছে।' });
      return;
    }

    const session = createGameSession(record.uid, gameId);
    res.json({
      sessionId: session.sessionId,
      nonce: session.nonce,
      startedAt: session.startedAt,
      dailyLimit: settings.dailyPointLimit,
      dailyPointsEarned: record.daily.pointsEarned,
      dailyRemaining: Math.max(0, settings.dailyPointLimit - record.daily.pointsEarned)
    });
  });

  app.post('/api/games/session/finish', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const record = req.playerRecord!;
    const outcome = validateAndScoreSubmission(record, {
      sessionId: String(req.body?.sessionId || ''),
      nonce: String(req.body?.nonce || ''),
      gameId: req.body?.gameId as GameId,
      score: Number(req.body?.score),
      durationMs: Number(req.body?.durationMs),
      pausedMs: Number(req.body?.pausedMs || 0),
      stats: typeof req.body?.stats === 'object' && req.body?.stats !== null ? req.body.stats : {}
    });

    res.status(outcome.statusCode).json(outcome);
  });

  app.post('/api/games/session/revive', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const record = req.playerRecord!;
    const sessionId = String(req.body?.sessionId || '');
    const nonce = String(req.body?.nonce || '');
    const gameId = req.body?.gameId as GameId;
    if (!gameId || !(gameId in GAMES_BY_ID)) {
      res.status(400).json({ error: 'Invalid game selection.' });
      return;
    }
    const result = claimSessionRevive(record, sessionId, nonce, gameId);
    if (!result.ok) {
      res.status(result.statusCode).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  app.post('/api/games/session/double-reward', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const record = req.playerRecord!;
    const sessionId = String(req.body?.sessionId || '');
    const nonce = String(req.body?.nonce || '');
    const gameId = req.body?.gameId as GameId;
    if (!gameId || !(gameId in GAMES_BY_ID)) {
      res.status(400).json({ error: 'Invalid game selection.' });
      return;
    }
    const result = claimSessionDoubleReward(record, sessionId, nonce, gameId);
    if (!result.ok) {
      res.status(result.statusCode).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // Point redemption is disabled (prize winners are rewarded monthly on the 7th)

  // Player <-> Admin & Community Chat (Gmail-authenticated players)
  app.get('/api/chat/messages', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const record = req.playerRecord!;
    res.json({
      isBanned: record.isBanned,
      messages: record.isBanned ? [] : listChatMessagesForPlayer(record.uid)
    });
  });

  app.post('/api/chat/messages', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const record = req.playerRecord!;
    const channel = req.body?.channel === 'community' ? 'community' : 'direct';
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    const gameTag = typeof req.body?.gameTag === 'string' ? req.body.gameTag : undefined;

    const result = sendPlayerChatMessage({
      user: record,
      channel,
      text,
      gameTag
    });
    if (!result.ok) {
      res.status(record.isBanned ? 403 : 400).json({ error: result.error });
      return;
    }
    res.json({ message: result.message });
  });

  // Hidden Admin Panel Auth (Number + Password ONLY)
  app.get('/api/admin/auth-status', (_req, res) => {
    const status = getAdminAuthStatus();
    res.json({ setupRequired: status.setupRequired });
  });

  app.post('/api/admin/setup', (req, res) => {
    const rawPhone = typeof req.body?.phone === 'string' ? req.body.phone.trim().replace(/\s+/g, '') : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!BD_PHONE_REGEX.test(rawPhone)) {
      res.status(400).json({ error: 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।' });
      return;
    }
    if (rawPassword.length < 6 || rawPassword.length > 100) {
      res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
      return;
    }
    const result = bootstrapAdminCredential(rawPhone, rawPassword);
    if (!result.ok) {
      res.status(409).json({ error: result.error });
      return;
    }
    const token = createAdminToken(rawPhone);
    res.json({ token, phone: rawPhone });
  });

  app.post('/api/admin/login', (req, res) => {
    const rawPhone = typeof req.body?.phone === 'string' ? req.body.phone.trim().replace(/\s+/g, '') : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!rawPhone || !rawPassword) {
      res.status(400).json({ error: 'মোবাইল নম্বর এবং পাসওয়ার্ড উভয়ই দিন।' });
      return;
    }
    if (!verifyAdminLogin(rawPhone, rawPassword)) {
      res.status(401).json({ error: 'মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়।' });
      return;
    }
    const token = createAdminToken(rawPhone);
    res.json({ token, phone: rawPhone });
  });

  // Hidden Admin Panel APIs (Verified via Number + Password Admin Token)
  app.get('/api/admin/overview', requireAdminToken, (_req, res) => {
    res.json(getAdminSnapshot());
  });

  app.post('/api/admin/settings', requireAdminToken, (req, res) => {
    const updated = updateSettings({
      dailyPointLimit: req.body?.dailyPointLimit,
      globalCooldownMs: req.body?.globalCooldownMs,
      maintenanceMode: req.body?.maintenanceMode,
      disabledGames: req.body?.disabledGames,
      adSettings: req.body?.adSettings
    });
    res.json({ settings: updated });
  });

  app.post('/api/admin/users/:uid', requireAdminToken, (req, res) => {
    const uid = String(req.params.uid || '');
    const type = req.body?.type;
    if (!['ban', 'unban', 'adjustPoints', 'resetFlags'].includes(type)) {
      res.status(400).json({ error: 'অবৈধ অ্যাকশন।' });
      return;
    }
    const updated = adminAdjustUser(uid, {
      type,
      pointsDelta: typeof req.body?.pointsDelta === 'number' ? req.body.pointsDelta : undefined
    });
    if (!updated) {
      res.status(404).json({ error: 'ব্যবহারকারী পাওয়া যায়নি।' });
      return;
    }
    res.json({ user: updated });
  });

  // Point redemption admin resolution removed (NO Point Redeem option)

  // 1-Click Monthly Leaderboard Reset (Starts new month/season with all scores at 0)
  app.post('/api/admin/leaderboard/reset', requireAdminToken, (_req, res) => {
    const result = resetMonthlyLeaderboard();
    res.json(result);
  });

  // 1-Click Monthly Referral Leaderboard Reset (Separate from Game Leaderboard Reset)
  app.post('/api/admin/referral/reset', requireAdminToken, (_req, res) => {
    const result = resetMonthlyReferralLeaderboard();
    res.json(result);
  });

  // Admin Referral Moderation: Delete a user's fake referral count or single fake referral link
  app.post('/api/admin/referrals/user/:uid/delete', requireAdminToken, (req, res) => {
    const uid = String(req.params.uid || '');
    const updated = adminDeleteUserReferralCount(uid);
    if (!updated) {
      res.status(404).json({ error: 'ব্যবহারকারী পাওয়া যায়নি।' });
      return;
    }
    res.json({ ok: true, user: updated });
  });

  app.post('/api/admin/referrals/event/:invitedUid/delete', requireAdminToken, (req, res) => {
    const invitedUid = String(req.params.invitedUid || '');
    const result = adminDeleteSingleReferral(invitedUid);
    if (!result) {
      res.status(404).json({ error: 'রেফারেল তথ্য পাওয়া যায়নি।' });
      return;
    }
    res.json(result);
  });

  // Admin Chat & Message Block System
  app.get('/api/admin/chat', requireAdminToken, (_req, res) => {
    res.json(getAdminChatOverview());
  });

  app.post('/api/admin/chat/send', requireAdminToken, (req, res) => {
    const channel = req.body?.channel === 'community' ? 'community' : 'direct';
    const targetUid = typeof req.body?.targetUid === 'string' ? req.body.targetUid : undefined;
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    const result = sendAdminChatMessage({ channel, targetUid, text });
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ message: result.message });
  });

  app.post('/api/admin/chat/messages/:id/block', requireAdminToken, (req, res) => {
    const id = String(req.params.id || '');
    const blocked = Boolean(req.body?.blocked);
    const updated = adminToggleBlockMessage(id, blocked);
    if (!updated) {
      res.status(404).json({ error: 'বার্তাটি পাওয়া যায়নি।' });
      return;
    }
    res.json({ message: updated });
  });

  // Vite middleware in dev, static serving in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PLAY & WIN BD server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
