import React, { useState } from 'react';
import {
  Brain,
  Car,
  Compass,
  Crown,
  Flame,
  Footprints,
  Gamepad2,
  Grid3X3,
  Keyboard,
  ParkingSquare,
  Play,
  Sparkles,
  Target,
  Trophy
} from 'lucide-react';
import type { GameId } from '../data/gamesCatalog';

const BRAND_LOGO_IMG = '/src/assets/images/brand_logo_3d_digital_1795607738165.jpg';

export const GAME_POSTERS: Record<GameId, string> = {
  'endless-runner': '/src/assets/images/poster_endless_runner_1795554166351.jpg',
  'candy-match': '/src/assets/images/poster_candy_match_1795554163772.jpg',
  'car-racing': '/src/assets/images/poster_car_racing_1795554163766.jpg',
  'bubble-shooter': '/src/assets/images/poster_bubble_shooter_1795554164553.jpg',
  'fruit-slice': '/src/assets/images/poster_fruit_slice_1795554165048.jpg',
  'brain-iq': '/src/assets/images/poster_brain_iq_1795554165521.jpg',
  'football-penalty': '/src/assets/images/poster_football_penalty_1795554166147.jpg',
  'block-puzzle': '/src/assets/images/poster_block_puzzle_1795554166570.jpg',
  'ludo-ai': '/src/assets/images/poster_ludo_ai_1795554167006.jpg',
  'car-parking': '/src/assets/images/poster_car_parking_1795554167016.jpg',
  'treasure-hunt': '/src/assets/images/poster_treasure_hunt_1795554187153.jpg',
  'typing-speed': '/src/assets/images/poster_typing_speed_1795554168742.jpg'
};

function getGameIcon(gameId: GameId) {
  switch (gameId) {
    case 'endless-runner':
      return Footprints;
    case 'candy-match':
      return Sparkles;
    case 'car-racing':
      return Car;
    case 'bubble-shooter':
      return Target;
    case 'fruit-slice':
      return Flame;
    case 'brain-iq':
      return Brain;
    case 'football-penalty':
      return Trophy;
    case 'block-puzzle':
      return Grid3X3;
    case 'ludo-ai':
      return Crown;
    case 'car-parking':
      return ParkingSquare;
    case 'treasure-hunt':
      return Compass;
    case 'typing-speed':
      return Keyboard;
  }
}

export function BrandLogo3D({ compact = false }: { compact?: boolean }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="inline-flex items-center gap-2.5 select-none group">
      {/* Updated Modern 3D Digital Crystal & Gold Emblem */}
      <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 via-emerald-400 to-cyan-500 p-[2px] shadow-[0_8px_26px_rgba(16,185,129,0.55),0_0_16px_rgba(251,191,36,0.4),inset_0_1px_1px_rgba(255,255,255,0.85)] shrink-0 transition-transform duration-200 group-hover:scale-105">
        <div className="w-full h-full rounded-[14px] bg-slate-950 overflow-hidden relative flex items-center justify-center">
          {!imgErr ? (
            <img
              src={BRAND_LOGO_IMG}
              alt="PLAY & WIN BD Logo"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover scale-105"
            />
          ) : (
            <Gamepad2 className="w-6 h-6 text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.9)]" />
          )}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* 3D Digital Metallic Typography */}
      <div className="flex flex-col leading-none">
        <span
          className={`${
            compact ? 'text-base sm:text-xl' : 'text-xl sm:text-2xl'
          } font-black tracking-tight whitespace-nowrap drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)]`}
        >
          <span className="bg-gradient-to-b from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
            PLAY &amp; WIN{' '}
          </span>
          <span className="bg-gradient-to-b from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(251,191,36,0.55)]">
            BD
          </span>
        </span>
      </div>
    </div>
  );
}

export function GameLogo3D({
  gameId,
  accentColor,
  size = 'md'
}: {
  gameId: GameId;
  accentColor: string;
  size?: 'md' | 'lg';
}) {
  const [imgErr, setImgErr] = useState(false);
  const Icon = getGameIcon(gameId);
  const isLg = size === 'lg';
  const posterSrc = GAME_POSTERS[gameId];

  return (
    <div className={`relative flex items-center justify-center ${isLg ? 'w-72 h-52 sm:w-80 sm:h-60' : 'w-full h-40'}`}>
      <div
        className="absolute -inset-2 rounded-[32px] blur-2xl opacity-60 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accentColor}, rgba(251,191,36,0.35), transparent 72%)` }}
      />
      <div
        className={`relative w-full h-full ${
          isLg ? 'rounded-[28px]' : 'rounded-2xl'
        } p-[2px] shadow-2xl overflow-hidden`}
        style={{
          background: `linear-gradient(145deg, rgba(255,255,255,0.75), ${accentColor}, rgba(251,191,36,0.75), rgba(15,23,42,0.95))`,
          boxShadow: `0 ${isLg ? 20 : 12}px ${isLg ? 48 : 26}px -6px ${accentColor}99, inset 0 1px 2px rgba(255,255,255,0.55)`
        }}
      >
        <div
          className={`w-full h-full ${
            isLg ? 'rounded-[26px]' : 'rounded-[14px]'
          } relative overflow-hidden flex items-center justify-center bg-slate-950`}
        >
          {!imgErr && posterSrc ? (
            <img
              src={posterSrc}
              alt={gameId}
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon
              className={isLg ? 'w-16 h-16 relative z-10' : 'w-10 h-10 relative z-10'}
              style={{
                color: accentColor,
                filter: `drop-shadow(0 4px 12px ${accentColor}AA)`
              }}
            />
          )}
          <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-slate-950/65 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

export function GameCardArtwork({
  gameId,
  accentColor,
  title,
  disabledLabel
}: {
  gameId: GameId;
  accentColor: string;
  title?: string;
  disabledLabel?: string | null;
}) {
  const [imgErr, setImgErr] = useState(false);
  const Icon = getGameIcon(gameId);
  const posterSrc = GAME_POSTERS[gameId];

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl p-[2px] shadow-2xl group transition-transform duration-200 active:scale-[0.98]"
      style={{
        background: `linear-gradient(145deg, rgba(255,255,255,0.55), ${accentColor}, rgba(251,191,36,0.45), rgba(15,23,42,0.95))`,
        boxShadow: `0 16px 34px -10px ${accentColor}77, inset 0 1px 1px rgba(255,255,255,0.45)`
      }}
    >
      <div
        className="relative w-full h-full rounded-[22px] overflow-hidden flex items-center justify-center bg-slate-950"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${accentColor}40, rgba(9, 14, 26, 0.98) 78%)`
        }}
      >
        {!imgErr && posterSrc ? (
          <img
            src={posterSrc}
            alt={title || gameId}
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Icon
            className="w-14 h-14"
            style={{
              color: accentColor,
              filter: `drop-shadow(0 6px 14px ${accentColor}BB)`
            }}
          />
        )}

        {/* Glossy 3D highlight & bottom scrim */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent pointer-events-none" />

        {/* Embedded inside the 3D frame so there is ZERO text below game cards */}
        {(title || disabledLabel) && (
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 z-10">
            {title && (
              <span className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                {title}
              </span>
            )}
            <span
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                disabledLabel
                  ? 'bg-rose-500/90 text-white'
                  : 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950'
              }`}
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
