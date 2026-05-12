'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../public/src/utils/supabase';
import { syncStreakFromSupabase, readStreakFromLocal } from '../../../public/src/utils/streakUtils'; // adjust path



// ─── Types ───────────────────────────────────────────────────────────────────
type User = {
  id: string;
  email?: string;
  name?: string;
  exam?: string;
  cl?: string;
  [key: string]: any;
};

// ─── Constants ───────────────────────────────────────────────────────────────
const EXAM_OPTIONS = ['JEE Mains', 'NEET', 'JEE Advanced', 'Other'];
const CLASS_OPTIONS = ['11th', '12th', 'Dropper', 'Other'];
const SESSION_KEY = 'questionSessionResponses_v1';
const DAILY_GOAL_KEY = 'rookie_daily_goal';
const STREAK_KEY = 'rookie_streak_data';

const DAILY_GOAL_OPTIONS = [5, 10, 20, 30, 50];

const socialMediaLinks = [
  {
    label: 'Instagram',
    icon: '/instagram 1.png',
    url: 'https://www.instagram.com/rookie_ai.2006?igsh=ajB6YXRnNnJ4OGZ2',
  },
  {
    label: 'LinkedIn',
    icon: '/linkedin (2) 1.png',
    url: 'https://www.linkedin.com/in/dhruv-pathak-437a56365/',
  },
  {
    label: 'Reddit',
    icon: '/reddit 3.png',
    url: 'https://www.reddit.com/user/Last-Benefit2242/',
  },
  {
    label: 'Discord',
    icon: '/discord 1.png',
    url: 'https://discord.gg/snh7kFPV',
  },
];



// ─── Helpers ─────────────────────────────────────────────────────────────────
function openExternal(url?: string) {
  if (!url || typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Count questions solved today from sessionResponses
function countSolvedToday(): number {
  try {
    // Primary: date-stamped key written by QuestionViewer
    const todayKey = `questionsToday_${new Date().toDateString()}`;
    const stamped = localStorage.getItem(todayKey);
    if (stamped) return parseInt(stamped, 10);
    // Fallback: generic key
    const generic = localStorage.getItem('questionsToday');
    return generic ? parseInt(generic, 10) : 0;
  } catch {
    return 0;
  }
}

function computeStreak(): { current: number; longest: number; activeDays: string[] } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { current: 0, longest: 0, activeDays: [] };
    return JSON.parse(raw);
  } catch {
    return { current: 0, longest: 0, activeDays: [] };
  }
}

// ─── useTheme hook ────────────────────────────────────────────────────────────
function useTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    try { setIsDark(localStorage.getItem('theme') !== 'light'); } catch {}
    const observer = new MutationObserver(() => {
      try { setIsDark(localStorage.getItem('theme') !== 'light'); } catch {}
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const onStorage = () => { try { setIsDark(localStorage.getItem('theme') !== 'light'); } catch {} };
    window.addEventListener('storage', onStorage);
    return () => { observer.disconnect(); window.removeEventListener('storage', onStorage); };
  }, []);
  return isDark;
}

function toggleTheme(isDark: boolean) {
  const next = isDark ? 'light' : 'dark';
  try {
    localStorage.setItem('theme', next);
    if (next === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    // Dispatch storage event so hook picks it up in same tab
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: next }));
  } catch {}
}

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, delay: i * 0.07 },
  }),
};

// ─── Day-of-week strip ────────────────────────────────────────────────────────
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getDayOfWeek() {
  // 0=Sun → map to index 6, 1=Mon → 0, etc.
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

// ─── Monthly Calendar ─────────────────────────────────────────────────────────
function MonthlyCalendar({ activeDays, isDark }: { activeDays: string[]; isDark: boolean }) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();
  const todayKey = getTodayKey();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - daysInMonth - firstDay + 1, current: false });
  }

  const isActive = (day: number) => {
    const key = `${year}-${month + 1}-${day}`;
    return activeDays.includes(key);
  };

  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const card = isDark ? 'bg-[#0A0E17]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-[#1D2939]' : 'border-gray-200';

  return (
    <div className={`mt-4 rounded-2xl ${card} border ${border} p-4`}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className={`w-7 h-7 flex items-center justify-center rounded-full transition-all hover:bg-orange-500/10 ${subtext} hover:text-orange-500`}
        >
          ‹
        </button>
        <span className={`text-sm font-semibold ${text}`}>{monthName} {year}</span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className={`w-7 h-7 flex items-center justify-center rounded-full transition-all hover:bg-orange-500/10 ${subtext} hover:text-orange-500`}
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className={`text-center text-xs font-medium ${subtext}`}>{d}</div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, i) => {
          const active = cell.current && isActive(cell.day);
          const tod = cell.current && isToday(cell.day);
          return (
            <div key={i} className="flex items-center justify-center">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-medium transition-all
                  ${!cell.current ? subtext + ' opacity-30' : ''}
                  ${cell.current && !active && !tod ? text : ''}
                  ${active ? 'border-2 border-orange-500 text-orange-500 bg-orange-500/10' : ''}
                  ${tod && !active ? 'underline decoration-blue-400 decoration-2 underline-offset-2' : ''}
                  ${tod && active ? 'border-2 border-orange-500 text-orange-500 bg-orange-500/10 underline decoration-blue-400 decoration-2 underline-offset-2' : ''}
                `}
              >
                {cell.day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Streak Card ──────────────────────────────────────────────────────────────
function StreakCard({ isDark }: { isDark: boolean }) {
  const [streakData, setStreakData] = useState({ current: 0, longest: 0, activeDays: [] as string[] });
  const [showCalendar, setShowCalendar] = useState(false);
  const [copied, setCopied] = useState(false);

  const todayIndex = getDayOfWeek();

  const reloadStreak = () => {
    setStreakData(readStreakFromLocal());
  };
  
  useEffect(() => {
    // Instant load from localStorage
    reloadStreak();
    
    // Background sync from Supabase (doesn't block UI)
    syncStreakFromSupabase();
  
    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'rookie_streak_data') reloadStreak();
    };
    window.addEventListener('storage', handleStorageChange);
  
    // Listen for visibility changes (refresh when tab becomes active)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        reloadStreak();
        syncStreakFromSupabase();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for custom streak update event from background sync
    const handleStreakUpdated = (e: Event) => {
      reloadStreak();
    };
    window.addEventListener('streakUpdated', handleStreakUpdated);
  
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('streakUpdated', handleStreakUpdated);
    };
  }, []);


  const handleShare = async () => {
    const text = `🔥 I'm on a ${streakData.current}-day streak on Rookie! Join me at https://rookie-ai.vercel.app`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const card = isDark ? 'bg-[#0A0E17] border-[#1D2939]' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const divider = isDark ? 'border-[#1D2939]' : 'border-gray-100';
  const toggleBg = isDark ? 'bg-[#111827] border-[#1D2939] hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300';

  return (
    <div className={`rounded-2xl border ${card} p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-orange-500 leading-none">
            {streakData.current} day{streakData.current !== 1 ? 's' : ''} streak
          </h2>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleShare}
          className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${toggleBg}`}
          title={copied ? 'Copied!' : 'Share streak'}
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={subtext}>
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* Day dots */}
      <div className="flex items-center gap-2 mb-4">
      {DAYS.map((day, i) => {
  // Calculate actual calendar date for this dot (Mon=0 ... Sun=6)
  const today = new Date();
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0
  const diff = i - todayDow;
  const dotDate = new Date(today);
  dotDate.setDate(today.getDate() + diff);
  const dotKey = `${dotDate.getFullYear()}-${dotDate.getMonth() + 1}-${dotDate.getDate()}`;
  const isActive = streakData.activeDays.includes(dotKey);
  const isCurrent = i === todayIndex;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-full aspect-square max-w-[36px] rounded-full border-2 flex items-center justify-center transition-all
                  ${isCurrent
                    ? 'border-orange-500 bg-orange-500/10'
                    : isActive
                      ? 'border-orange-400 bg-orange-400/20'
                      : isDark ? 'border-[#1D2939] bg-transparent' : 'border-gray-200 bg-transparent'
                  }`}
              >
                {isCurrent && (
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-orange-500" />
                )}
                {isActive && !isCurrent && (
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                )}
              </div>
              <span className={`text-[10px] font-medium ${isCurrent ? 'text-orange-500' : subtext}`}>{day}</span>
            </div>
          );
        })}
      </div>

      {/* Toggle calendar */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowCalendar((p) => !p)}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${toggleBg} ${text}`}
      >
        {showCalendar ? 'Hide monthly streak' : 'View monthly streak'}
        <motion.svg
          animate={{ rotate: showCalendar ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={subtext}
        >
          <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <MonthlyCalendar activeDays={streakData.activeDays} isDark={isDark} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider + Longest streak */}
      <div className={`mt-4 pt-4 border-t ${divider} flex items-end justify-between`}>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${subtext} mb-0.5`}>Longest Streak</p>
          <p className={`text-2xl font-extrabold ${text}`}>{streakData.longest} day{streakData.longest !== 1 ? 's' : ''}</p>
        </div>
        {/* Flame icon */}
        <div className="relative">
          <Image src="flame.svg" alt="Coins" width={33} height={33} />
        </div>
      </div>
    </div>
  );
}

// ─── Daily Goal Progress Bar ──────────────────────────────────────────────────
function DailyGoalBar({ isDark }: { isDark: boolean }) {
  const [goal, setGoal] = useState<number | null>(null);
  const [solved, setSolved] = useState(0);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [tempGoal, setTempGoal] = useState(20);

  useEffect(() => {
    const refresh = () => {
      try {
        const savedGoal = localStorage.getItem(DAILY_GOAL_KEY);
        if (savedGoal) setGoal(parseInt(savedGoal, 10));
        setSolved(countSolvedToday());
      } catch {}
    };
    refresh();
    // Re-read when the tab becomes visible again (user returns from QuestionViewer)
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    // Also re-read if another tab writes to localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('questionsToday')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const saveGoal = (g: number) => {
    try {
      localStorage.setItem(DAILY_GOAL_KEY, String(g));
    } catch {}
    setGoal(g);
    setShowGoalPicker(false);
  };


  const progress = goal ? Math.min(solved / goal, 1) : 0;
  const pct = Math.round(progress * 100);

  // 5 milestone icons at 0%, 25%, 50%, 75%, 100%
  const milestones = [0, 0.25, 0.5, 0.75, 1];

  const card = isDark ? 'bg-[#0A0E17] border-[#1D2939]' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const trackBg = isDark ? 'bg-[#1D2939]' : 'bg-gray-100';
  const toggleBg = isDark ? 'bg-[#111827] border-[#1D2939]' : 'bg-gray-50 border-gray-200';

  return (
    <div className={`rounded-2xl border ${card} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`text-sm font-semibold ${text}`}>Daily Goal</span>
          {goal && (
            <span className={`ml-2 text-sm font-bold text-orange-500`}>
              ({solved}/{goal} Qs)
            </span>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowGoalPicker((p) => !p)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${toggleBg} ${text}`}
        >
          {goal ? 'Change' : 'Set goal'}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.button>
      </div>

      <AnimatePresence>
        {showGoalPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className={`p-3 rounded-xl border ${toggleBg} border-opacity-50`}>
              <p className={`text-xs font-medium mb-2.5 ${subtext}`}>Questions per day</p>
              <div className="flex gap-2 flex-wrap">
                {DAILY_GOAL_OPTIONS.map((g) => (
                  <motion.button
                    key={g}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => saveGoal(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                      ${goal === g
                        ? 'bg-orange-500 text-white border-orange-500'
                        : isDark
                          ? 'border-[#1D2939] text-gray-400 hover:border-orange-500/40 hover:text-orange-400'
                          : 'border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500'
                      }`}
                  >
                    {g} Qs
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {goal ? (
        <div className="relative">
          {/* Track */}
          <div className={`relative h-2 rounded-full ${trackBg} overflow-visible`}>
            {/* Fill */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
            />
          </div>

          {/* Milestone icons */}
          <div className="relative flex items-center mt-3">
            {milestones.map((m, i) => {
              const reached = progress >= m;
              const isLast = i === milestones.length - 1;
              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${m * 100}%`, transform: 'translateX(-50%)' }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                      ${reached
                        ? isLast ? 'bg-orange-500/20 border-2 border-orange-500' : 'bg-orange-500/10'
                        : isDark ? 'bg-[#1D2939]' : 'bg-gray-100'
                      }`}
                  >
                    {/* SVG icons – placeholders, user will replace from /public */}
                    {i === 0 && (
                    <Image src= "standing-man.svg" alt="Coins" width={13} height={13}  className={reached ? 'text-orange-500' : subtext }  />
                    )}
                    {i === 1 && (
                   <Image src= "athletics.svg" alt="Coins" width={16} height={16}  className={reached ? 'text-orange-500' : subtext} />
                    )}
                    {i === 2 && (
                     <Image src= "sprinter.svg" alt="Coins" width={16} height={16}  className={reached ? 'text-orange-500' : subtext} />
                    )}
                    {i === 3 && (
                     <Image src= "sprint.svg" alt="Coins" width={16} height={16}  className={reached ? 'text-orange-500' : subtext} />
                    )}
                    {i === 4 && (
                     <Image src= "checkered-flag.svg" alt="Coins" width={18} height={18}  className={reached ? 'text-orange-500' : subtext} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-10" />

          {pct >= 100 && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-center font-semibold text-orange-500 mt-1"
            >
              🎉 Daily goal complete!
            </motion.p>
          )}
        </div>
      ) : (
        <div
          className={`flex flex-col items-center justify-center py-4 rounded-xl border border-dashed text-center gap-1
            ${isDark ? 'border-[#1D2939]' : 'border-gray-200'}`}
        >
          <p className={`text-sm font-medium ${subtext}`}>Set a daily goal to track progress</p>
          <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Stay consistent, crack your exam.</p>
        </div>
      )}
    </div>
  );
}


// ─── ContinueSection component (add to your home page file) ─────────────
// ─── ContinueSection component (updated) ─────────────────────────────
function ContinueSection({ isDark }: { isDark: boolean }) {
  const [session, setSession] = useState<{
    chapter_title: string; subject_name: string; image_key: string; question_index: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('user_recent_session')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setSession(data);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className={`text-base font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Continue where you left off
        </h2>
        {/* Skeleton loader */}
        <div className={`w-full p-4 rounded-2xl border animate-pulse ${isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 rounded-lg ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} style={{ width: '70%' }} />
              <div className={`h-3 rounded-lg ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} style={{ width: '50%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mb-6">
      <h2 className={`text-base font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Continue where you left off
      </h2>
      <button
        onClick={() => {
          // Fix: Route to the correct path with proper parameters
          if (!session.chapter_title) return;
          const params = new URLSearchParams({
            chapterTitle: session.chapter_title,
            subjectName: session.subject_name || '',
            imageKey: session.image_key || '',
            startIndex: String(session.question_index || 0),
          });
          router.push(`/questionviewer?${params.toString()}`);
        }}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-[#0d1117] border-[#1e2538] hover:border-indigo-500/40' : 'bg-white border-[#E5E7EB] hover:border-indigo-300'
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{session.chapter_title}</p>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Question {session.question_index + 1} · {session.subject_name}
          </p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-40">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
  );
}

// ─── RecommendedSection component (updated) ─────────────────────────────────
function RecommendedSection({ isDark }: { isDark: boolean }) {
  const [recommended, setRecommended] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get topics the user has answered questions in
        const { data: activity } = await supabase
          .from('user_activity')
          .select('chapter_title, subject_name, image_key, is_correct')
          .eq('user_id', user.id)
          .order('answered_at', { ascending: false })
          .limit(50);

        if (!activity?.length) {
          setLoading(false);
          return;
        }

        // Find chapter with most wrong answers (needs revision)
        const chapterStats: Record<string, { total: number; wrong: number; subject: string; imageKey: string }> = {};
        for (const row of activity) {
          if (!chapterStats[row.chapter_title]) {
            chapterStats[row.chapter_title] = { total: 0, wrong: 0, subject: row.subject_name || '', imageKey: row.image_key || '' };
          }
          chapterStats[row.chapter_title].total++;
          if (!row.is_correct) chapterStats[row.chapter_title].wrong++;
        }

        // Pick chapter with highest wrong rate (min 3 questions answered)
        let best = null, bestRate = -1;
        for (const [title, stats] of Object.entries(chapterStats)) {
          if (stats.total < 3) continue;
          const rate = stats.wrong / stats.total;
          if (rate > bestRate) { bestRate = rate; best = { title, ...stats }; }
        }

        if (best) setRecommended(best);
      } catch (err) {
        console.error('Error loading recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className={`text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Recommended for you
        </h2>
        <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Based on your recent activity
        </p>
        {/* Skeleton loader */}
        <div className={`w-full p-4 rounded-2xl border animate-pulse ${isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'}`}>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className={`h-4 rounded-lg ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} style={{ width: '60%' }} />
                <div className={`h-3 rounded-lg ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} style={{ width: '80%' }} />
              </div>
              <div className={`w-12 h-8 rounded-lg flex-shrink-0 ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} />
            </div>
            <div className={`h-2 rounded-full ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>
    );
  }

  if (!recommended) return null;

  const wrongPct = Math.round((recommended.wrong / recommended.total) * 100);

  return (
    <div className="mb-6">
      <h2 className={`text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Recommended for you
      </h2>
      <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Based on your recent activity
      </p>
      <button
        onClick={() => {
          // Fix: Route properly with all parameters
          const params = new URLSearchParams({
            chapterTitle: recommended.title,
            subjectName: recommended.subject || '',
            imageKey: recommended.imageKey || '',
            startIndex: '0',
          });
          router.push(`/questionviewer?${params.toString()}`);
        }}
        className={`w-full p-4 rounded-2xl border text-left transition-all ${
          isDark ? 'bg-[#0d1117] border-[#1e2538] hover:border-amber-500/40' : 'bg-white border-[#E5E7EB] hover:border-amber-300'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-medium">
                Needs Revision
              </span>
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{recommended.subject}</span>
            </div>
            <p className="font-semibold text-sm leading-snug">{recommended.title}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-amber-500">{wrongPct}%</p>
            <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>error rate</p>
          </div>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#1e2538]' : 'bg-gray-100'}`}>
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${wrongPct}%` }}
          />
        </div>
        <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {recommended.wrong} wrong out of {recommended.total} attempted
        </p>
      </button>
    </div>
  );
}

// ─── Theme Toggle Button ──────────────────────────────────────────────────────
function ThemeToggle({ isDark }: { isDark: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => toggleTheme(isDark)}
      className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all
        ${isDark
          ? 'bg-[#0A0E17] border-[#1D2939] hover:border-gray-600'
          : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
        }`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.svg key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </motion.svg>
        ) : (
          <motion.svg key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const isDark = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cl, setcl] = useState('');
  const [exam, setExam] = useState('');
  const [saving, setSaving] = useState(false);

  // Apply body background on theme change
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.backgroundColor = isDark ? '#000000' : '#F9FAFB';
  }, [isDark]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem('@user');
      if (!cached) return;
      const parsed: User = JSON.parse(cached);
      setUser(parsed);
      if (!parsed.cl || !parsed.exam) {
        setShowProfileModal(true);
      } else {
        setcl(parsed.cl || '');
        setExam(parsed.exam || '');
      }
    } catch {}
  }, []);

  const saveProfile = async () => {
    if (!cl || !exam) { alert('Please select your class and exam'); return; }
    if (!user) { alert('No user loaded'); return; }
    try {
      setSaving(true);
      const { error } = await supabase.from('users').update({ cl, exam }).eq('id', user.id);
      if (error) throw error;
      const updated = { ...user, cl, exam };
      localStorage.setItem('@user', JSON.stringify(updated));
      setUser(updated);
      setShowProfileModal(false);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const inviteFriends = async () => {
    const link = 'https://rookie-ai.vercel.app';
    const text = `Hey! 👋 Join me on Rookie to study smarter together 🚀\n${link}`;
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share({ title: 'Rookie', text, url: link }); return; } catch {}
    }
    const encoded = encodeURIComponent(text);
    if (typeof window !== 'undefined') {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = `whatsapp://send?text=${encoded}`;
        setTimeout(() => window.open(`https://wa.me/?text=${encoded}`, '_blank'), 800);
        return;
      }
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || null;

  // ── Theme-aware class shortcuts ──
  const bg = isDark ? 'bg-[#000000]' : 'bg-[#F9FAFB]';
  const card = isDark ? 'bg-[#0A0E17] border-[#1D2939]' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-[#1D2939]' : 'border-gray-200';
  const modalBg = isDark ? 'bg-[#0A0E17] border-[#1D2939]' : 'bg-white border-gray-200';
  const pillInactive = isDark
    ? 'bg-transparent border-[#1D2939] text-gray-400 hover:border-gray-500'
    : 'bg-transparent border-gray-200 text-gray-500 hover:border-gray-400';
  const pillActive = isDark ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900';

  return (
    <main className={`min-h-screen ${bg} ${text} transition-colors duration-300`}>

      {/* ─── Profile Completion Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`w-full max-w-md ${modalBg} border rounded-2xl p-6`}
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <h3 className={`${text} text-lg font-bold mb-1`}>Complete your profile</h3>
              <p className={`text-sm ${subtext} mb-5`}>
                A couple of details to personalise your experience.
              </p>

              <label className={`block text-xs font-semibold ${subtext} uppercase tracking-wider mb-2`}>
                Class
              </label>
              <div className="flex flex-wrap gap-2 mb-5">
                {CLASS_OPTIONS.map((g) => (
                  <motion.button
                    key={g}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setcl(g)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      cl === g ? pillActive : pillInactive
                    }`}
                  >
                    {g}
                  </motion.button>
                ))}
              </div>

              <label className={`block text-xs font-semibold ${subtext} uppercase tracking-wider mb-2`}>
                Target Exam
              </label>
              <div className="flex flex-wrap gap-2 mb-7">
                {EXAM_OPTIONS.map((e) => (
                  <motion.button
                    key={e}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setExam(e)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      exam === e ? pillActive : pillInactive
                    }`}
                  >
                    {e}
                  </motion.button>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className={`px-4 py-2 rounded-xl text-sm ${subtext} border ${border} hover:border-gray-500 transition-colors`}
                >
                  Skip
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveProfile}
                  disabled={saving}
                  className={`px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-60 transition-all
                    ${isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}
                >
                  {saving ? 'Saving…' : 'Continue'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Page Body ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="max-w-2xl mx-auto px-4 sm:px-6 pb-10"
      >

        {/* ── Greeting Hero ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="pt-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className={`${subtext} text-sm mb-1`}>
                {getGreeting()}{firstName ? `, ${firstName}` : ', learner'} 👋
              </p>
              <h1 className="text-3xl font-bold leading-tight tracking-tight">
                Ready to crack
                <br />
               
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                
                  {exam || 'your exam'}?
                </span>
              </h1>
            </div>
         
          </div>

          {(cl || exam) && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {cl && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${card} ${text}`}>
                  {cl}
                </span>
              )}
              {exam && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500">
                  {exam}
                </span>
              )}
              <button
                onClick={() => setShowProfileModal(true)}
                className={`text-xs ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'} transition-colors underline underline-offset-2`}
              >
                Edit
              </button>
            </div>
          )}
        </motion.section>

        {/* ── Streak & Daily Goal ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="mt-6 space-y-3"
        >
          <StreakCard isDark={isDark} />
          <DailyGoalBar isDark={isDark} />
        </motion.section>

        {/* ── Continue Where You Left Off ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mt-6"
        >
          <ContinueSection isDark={isDark} />
        </motion.section>

        {/* ── Recommended For You ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mt-2"
        >
          <RecommendedSection isDark={isDark} />
        </motion.section>

        {/* ── Invite Friends ── */}

        {/* ── Invite Friends ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={6}
          className="mt-8"
        >
          <div className="rounded-2xl relative overflow-hidden bg-gradient-to-r from-[#0F7E6B] to-[#2E5BFF] p-5 flex items-center gap-4">
          <div className="flex-1 min-w-0 z-10 pb-14">
              <h3 className="text-white font-bold text-base leading-snug">
                Study with your friends!
              </h3>
              <p className="text-white/75 text-sm mt-1 leading-relaxed">
                Invite friends to Rookie and learn together.
              </p>
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

            
            <div className="absolute right-12 -bottom-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

        
              <motion.button
  whileTap={{ scale: 0.97 }}
  onClick={inviteFriends}
  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full text-sm font-bold shadow-md"
>
 
  Invite Now 
  <img src="/arrow.png" alt="invite" className="w-4 h-4" />
</motion.button>
            </div>

            <div className="w-58 h-40 relative hidden sm:block flex-shrink-0 z-10">
              <Image
                src="/invite_friends.png"
                alt="Invite friends"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </motion.section>

        <motion.section
  variants={fadeUp}
  initial="hidden"
  animate="visible"
  custom={7}
  className="mt-5"
>
  <div className="rounded-2xl p-5 bg-[#F05A24] relative overflow-hidden">

    {/* Background circles */}
    <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
    <div className="absolute right-2 -top-8 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />


    <h3 className="text-white font-bold text-base text-center relative z-10">
      We're on social media
    </h3>

    <p className="text-white/75 text-sm text-center mt-1 relative z-10">
      Follow us and share with your friends.
    </p>

    {/* 🆕 Image BEFORE buttons */}
    <div className="flex justify-center mt-6 relative z-10">
      <Image
        src="/social_illustration.png"   // your image path
        alt="Social media"
        width={240}
        height={240}
        className="object-contain"
      />
    </div>

    {/* Buttons */}
    <div className="flex flex-wrap justify-center gap-3 mt-4 relative z-10">
      {socialMediaLinks.map((item) => (
        <motion.button
          key={item.label}
          whileTap={{ scale: 0.96 }}
          onClick={() => openExternal(item.url)}
          className="flex items-center gap-2.5 bg-white rounded-xl px-4 py-2.5 w-[148px] justify-start shadow-sm hover:shadow-md transition-shadow"
          aria-label={`Open ${item.label}`}
        >
          <div className="w-5 h-5 relative flex-shrink-0">
            <Image
              src={item.icon}
              alt={item.label}
              fill
              style={{ objectFit: 'contain' }}
            />
          </div>
          <span className="text-sm font-semibold text-black">
            {item.label}
          </span>
        </motion.button>
      ))}
    </div>

  </div>
</motion.section>

        {/* ── Footer ── */}
        <motion.footer
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={8}
          className={`mt-10 border-t pt-8 pb-4 ${isDark ? 'border-[#1D2939]' : 'border-gray-200'}`}
        >
          {/* Top row: logo + tagline + social icons */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 flex-shrink-0">
                <Image src="/lg.png" alt="Rookie" fill style={{ objectFit: 'contain' }} />
              </div>
              <div>
               
                <p className={`font-bold text-sm leading-none ${text}`}>Rookie</p>
                <p className={`text-xs mt-0.5 ${subtext}`}>AI-powered exam prep</p>
              </div>
            </div>

          
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6">
            {[
              { label: 'Practice', path: '/explore' },
              { label: 'Leaderboard', path: '/leaderboard' },
              { label: 'Bookmarks', path: '/bookmark' },
              { label: 'Settings', path: '/profile' },
            ].map((link) => (
              <button
                key={link.label}
                onClick={() => router.push(link.path)}
                className={`text-xs font-medium transition-colors
                  ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Bottom bar */}
          <div className={`pt-4 border-t ${isDark ? 'border-[#1D2939]' : 'border-gray-100'} flex items-center justify-between flex-wrap gap-2`}>
            <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              © {new Date().getFullYear()} Rookie. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <button className={`text-xs transition-colors ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>
                Privacy
              </button>
              <button className={`text-xs transition-colors ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>
                Terms
              </button>
            </div>
          </div>
        </motion.footer>

        {/* bottom nav spacer */}
        <div className="h-4" />
      </motion.div>
    </main>
  );
}