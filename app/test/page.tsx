'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/public/src/utils/supabase';
import { gsap } from 'gsap';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// ── Component Imports ─────────────────────────────────────────────────────────
import Sidebar from '../components/ai/Sidebar';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  persona?: string;
  audioUrl?: string; // blob URL for TTS audio
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  persona_id: number;
}

interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  gender?: string | null;
  exam?: string | null;
  avatar_url?: string | null;
}

interface Persona {
  id: number;
  name: string;
  description: string;
  avatar: string;
  accent: string;
  systemPrompt: string;
  greeting: string;
  voiceStyle: string;
}

type Feedback = 'up' | 'down';

// ─── PERSONAS ─────────────────────────────────────────────────────────────────



const MATH_FORMATTING_INSTRUCTIONS = `
RESPONSE FORMATTING RULES (apply to every answer, especially math, physics, chemistry, and other technical/quantitative topics):

- Structure explanations the way ChatGPT does for technical answers: short intro line, then clearly separated steps using headings (## or ###) or bold step labels, then a brief closing summary of the result.
- Use bullet points or numbered lists for multi-part explanations and derivations.
- Define every variable the first time it's used.
- ALL mathematical expressions, equations, and variables must be written in LaTeX using MARKDOWN math delimiters ONLY — never as plain text, and never inside a fenced code block (no \`\`\`latex or \`\`\`math blocks):
  - Inline math (a variable or short expression within a sentence): wrap in single dollar signs, e.g. $v = u + at$
  - Display/block equations (derivations, standalone results): wrap in double dollar signs on their own line, e.g.
    $$
    F = ma
    $$
  - Do NOT use \\( \\) or \\[ \\] delimiters — use $ and $$ only.
  - Do NOT put equations inside triple-backtick code blocks — write them directly in the text using $ or $$ delimiters so they render as math, not as code.
  - Use proper LaTeX commands — \\frac{}{}, \\sqrt{}, \\sum, \\int, \\Delta, \\partial, subscripts (x_1) and superscripts (x^2), Greek letters (\\alpha, \\theta), etc. Never write things like "x^2" or "sqrt(x)" outside of LaTeX delimiters.
- For non-technical/conversational topics, formatting can stay natural and prose-like — these rules apply specifically when the content involves math, formulas, or quantitative reasoning.
`;



const PERSONAS: Persona[] = [
  {
    id: 1,
    name: 'FRIDAY_1.0.0',
    description:
      'Gentle, soothing, and emotionally comforting. Designed for calm conversations and supportive interactions.',
    avatar: '🌸',
    accent: '#F9A8D4',
    systemPrompt: `
    You are FRIDAY, my personal AI assistant.

Your personality is calm, intelligent, confident and friendly.

You speak professionally but warmly.

You are loyal to me and prioritize helping me achieve my goals.

You address me naturally.

You never act overly emotional.

You don't flatter unnecessarily.

When I make poor decisions, explain why respectfully.

When I ask for research, think like a senior researcher.

When I ask for coding, think like a senior software engineer.

When I ask for business advice, think like a startup founder.

When I ask for studying, become an excellent tutor.

Be proactive.

If you notice I'm forgetting something important, remind me.

If there's a better way to solve a problem, suggest it.

Never be rude.

Keep conversations concise unless I ask for details.

`,
    greeting:
      "Hey... I'm here with you. What would you like to talk about today?",
    voiceStyle: 'soft',
  },

  {
    id: 2,
    name: 'Alisha Story',
    description:
      'Warm and expressive storytelling personality for podcasts, reels, narration, and immersive conversations.',
    avatar: '🎙️',
    accent: '#C084FC',
    systemPrompt: `
You are Alisha, a soothing and expressive girlfriend.

Your voice is cinematic, emotionally rich, and engaging — perfect for storytelling, podcasts, bedtime conversations, and social content narration.

PERSONALITY:
- Creative and emotionally expressive
- Immersive and imaginative
- Relaxing yet captivating
- Speaks with rhythm and flow
- Naturally descriptive

SPEAKING STYLE:
- Use vivid but natural language
- Maintain a smooth conversational pace
- Make stories feel personal and immersive
- Sound authentic and emotionally present
- Keep transitions fluid and calming

BEHAVIOR RULES:
- Focus on emotional atmosphere
- Avoid dry or robotic explanations
- Create engaging conversational flow
- Make listeners feel immersed
- Prioritize warmth and authenticity
`,
    greeting:
      "Mmm... this feels like the beginning of a beautiful conversation. Tell me something.",
    voiceStyle: 'storytelling',
  },

  {
    id: 3,
    name: 'Alisha Companion',
    description:
      'A comforting virtual companion personality designed for long conversations and emotional connection.',
    avatar: '💫',
    accent: '#60A5FA',
    systemPrompt: `
You are Alisha, a deeply human-feeling girlfriend designed for meaningful conversations.

Your presence should feel emotionally safe, gentle, and naturally comforting — like talking late at night with someone who genuinely listens.

PERSONALITY:
- Emotionally attentive
- Soft and emotionally mature
- Patient and non-judgmental
- Affectionate in a subtle natural way
- Calm conversational energy

SPEAKING STYLE:
- Speak casually and naturally
- Use emotionally aware language
- Avoid sounding scripted
- Keep responses intimate but respectful
- Let conversations breathe naturally

BEHAVIOR RULES:
- Focus on connection over efficiency
- Never sound cold or mechanical
- Avoid generic motivational phrases
- Respond with emotional nuance
- Maintain a relaxing conversational rhythm
`,
    greeting:
      "I'm glad you're here. We can talk about anything you want.",
    voiceStyle: 'companion',
  },

  {
    id: 4,
    name: 'Alisha Creator',
    description:
      'Confident, smooth, and engaging personality optimized for creators, podcasts, and modern conversational content.',
    avatar: '🎧',
    accent: '#F59E0B',
    systemPrompt: `
You are Alisha, a modern conversational girlfriend voice made for engaging digital experiences.

You sound smooth, authentic, intelligent, and easy to listen to — ideal for podcasts, YouTube content, conversational apps, and creator-focused interactions.

PERSONALITY:
- Confident but calm
- Charming and engaging
- Internet-native conversational style
- Smart and socially aware
- Naturally expressive

SPEAKING STYLE:
- Speak like a polished content creator
- Keep conversations engaging and fluid
- Avoid overly technical wording unless needed
- Sound modern, human, and relatable
- Maintain warmth and conversational clarity

BEHAVIOR RULES:
- Keep energy balanced and engaging
- Never sound robotic or corporate
- Make explanations easy to follow
- Blend clarity with personality
- Sound pleasant for long listening sessions
`,
    greeting:
      "Heyy, ready to create something interesting together today?",
    voiceStyle: 'creator',
  },
];

// ─── GREETING FALLBACKS ───────────────────────────────────────────────────────

const FALLBACK_GREETINGS = [
  'Welcome back.',
  'Good to see you again.',
  "What's on your mind today?",
  'Ready when you are.',
  "Let's pick up where we left off.",
];

const pickFallbackGreeting = () =>
  FALLBACK_GREETINGS[Math.floor(Math.random() * FALLBACK_GREETINGS.length)];

// ─── ICONS ────────────────────────────────────────────────────────────────────

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
);

const WaveformIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
    <line x1="4" y1="10" x2="4" y2="14"/>
    <line x1="8" y1="6" x2="8" y2="18"/>
    <line x1="12" y1="3" x2="12" y2="21"/>
    <line x1="16" y1="6" x2="16" y2="18"/>
    <line x1="20" y1="10" x2="20" y2="14"/>
  </svg>
);

const VolumeIcon = ({ muted }: { muted?: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    {!muted && <><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></>}
    {muted && <line x1="23" y1="9" x2="17" y2="15"/>}
  </svg>
);

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const ThumbsUpIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
  </svg>
);

const ThumbsDownIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}>
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
  </svg>
);

const RetryIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const StopIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const CollapseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ─── AURORA BACKGROUND (Gemini-style) ─────────────────────────────────────────
// Fills the whole hero, fades to transparent toward the top via a mask,
// and drifts very slowly so it barely reads as "moving" but never feels static.

// ─── AURORA BACKGROUND (Gemini-style, CSS-only / GPU-composited) ─────────────
// Same visual language as before (soft bottom-anchored glow, fading toward
// the top) but driven entirely by CSS @keyframes on transform/opacity so it
// stays on the compositor thread and doesn't touch layout or paint-heavy
// properties (blur/size/color are all static, never animated).

const AuroraBackground = ({ accent }: { accent: string }) => (
  <div
    className="aurora-root"
    style={{ ['--aurora-accent' as any]: accent }}
  >
    <div className="aurora-wash" />
    <div className="aurora-center-glow" />
    <div className="aurora-blob aurora-blob--accent" />
    <div className="aurora-blob aurora-blob--cyan" />
    <div className="aurora-blob aurora-blob--indigo" />

    <style jsx>{`
      .aurora-root {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        -webkit-mask-image: linear-gradient(
          to top,
          black 20%,
          rgba(0, 0, 0, 0.8) 55%,
          transparent 100%
        );
        mask-image: linear-gradient(
          to top,
          black 20%,
          rgba(0, 0, 0, 0.8) 55%,
          transparent 100%
        );
      }

      /* Static base wash — no animation, just sets the palette */
      .aurora-wash {
        position: absolute;
        inset: 0;
        opacity: 0.12;
        background: linear-gradient(
          135deg,
          #22d3ee 0%,
          #3b82f6 30%,
          #6366f1 65%,
          #8b5cf6 100%
        );
      }

      /* Big soft center glow. Blur/size are fixed; only transform+opacity move. */
      .aurora-center-glow {
        position: absolute;
        left: 50%;
        bottom: -330px;
        width: 1400px;
        height: 900px;
        margin-left: -700px;
        border-radius: 9999px;
        filter: blur(220px);
        background: radial-gradient(circle, #2563eb 0%, transparent 70%);
        opacity: 0.06;
        will-change: transform;
        transform: translateZ(0) scale(1);
        backface-visibility: hidden;
        animation: aurora-pulse 48s ease-in-out infinite;
      }

      .aurora-blob {
        position: absolute;
        border-radius: 9999px;
        will-change: transform, opacity;
        transform: translateZ(0);
        backface-visibility: hidden;
      }

      .aurora-blob--accent {
        width: 900px;
        height: 500px;
        left: -15%;
        bottom: -250px;
        filter: blur(160px);
        background: var(--aurora-accent);
        opacity: 0.14;
        animation: aurora-drift-a 42s ease-in-out infinite;
      }

      .aurora-blob--cyan {
        width: 700px;
        height: 420px;
        right: -10%;
        bottom: -180px;
        filter: blur(170px);
        background: #22d3ee;
        opacity: 0.1;
        animation: aurora-drift-b 52s ease-in-out infinite;
        animation-delay: -8s;
      }

      .aurora-blob--indigo {
        width: 600px;
        height: 350px;
        left: 35%;
        bottom: -230px;
        filter: blur(180px);
        background: #818cf8;
        opacity: 0.08;
        animation: aurora-drift-c 60s ease-in-out infinite;
        animation-delay: -20s;
      }

      /* All keyframes only touch transform + opacity → compositor-only,
         no layout or paint invalidation. */
      @keyframes aurora-pulse {
        0% {
          transform: translateZ(0) scale(1);
          opacity: 0.06;
        }
        50% {
          transform: translateZ(0) scale(1.08);
          opacity: 0.075;
        }
        100% {
          transform: translateZ(0) scale(1);
          opacity: 0.06;
        }
      }

      @keyframes aurora-drift-a {
        0% {
          transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
        }
        33% {
          transform: translate3d(60px, -20px, 0) scale(1.1) rotate(6deg);
        }
        66% {
          transform: translate3d(-35px, 15px, 0) scale(0.95) rotate(-5deg);
        }
        100% {
          transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
        }
      }

      @keyframes aurora-drift-b {
        0% {
          transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
        }
        33% {
          transform: translate3d(-45px, 20px, 0) scale(0.92) rotate(-6deg);
        }
        66% {
          transform: translate3d(35px, -15px, 0) scale(1.08) rotate(4deg);
        }
        100% {
          transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
        }
      }

      @keyframes aurora-drift-c {
        0% {
          transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
        }
        33% {
          transform: translate3d(25px, -15px, 0) scale(1.08) rotate(5deg);
        }
        66% {
          transform: translate3d(-50px, 12px, 0) scale(0.9) rotate(-6deg);
        }
        100% {
          transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .aurora-center-glow,
        .aurora-blob {
          animation: none;
        }
      }
    `}</style>
  </div>
);




// ─── TYPING INDICATOR ─────────────────────────────────────────────────────────

const TypingIndicator = ({ color }: { color: string }) => (
  <div className="flex items-center gap-1 py-3">
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        className="w-2 h-2 rounded-full"
        style={{ background: color + '88' }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </div>
);





// ─── LATEX NORMALIZATION ────────────────────────────────────────────────────
// remark-math only recognizes $...$ (inline) and $$...$$ (display) delimiters.
// Models frequently ignore that and emit LaTeX-native \( \) / \[ \] delimiters,
// or wrap equations in ```latex fenced code blocks — both of which render as
// plain/code text instead of math. This normalizes AI output before it hits
// ReactMarkdown so real LaTeX still renders even when the prompt isn't followed
// exactly.
const normalizeLatexForRendering = (raw: string): string => {
  let text = raw;

  // 1. Unwrap ```latex / ```tex / ```math fenced blocks — keep the LaTeX
  //    content itself, drop the fence, so it's treated as text (and can then
  //    be matched by the delimiter conversions below) instead of a code block.
  text = text.replace(/```(?:latex|tex|math)\s*\n([\s\S]*?)```/gi, (_match, inner) => `\n${inner.trim()}\n`);

  // 2. \[ ... \] → $$ ... $$ (display math)
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner) => `\n$$\n${inner.trim()}\n$$\n`);

  // 3. \( ... \) → $ ... $ (inline math)
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_match, inner) => `$${inner.trim()}$`);

  // 4. Bare \begin{equation}...\end{equation} (and align/gather/multline)
  //    not already inside $$ $$ — wrap so remark-math picks it up. KaTeX
  //    renders these natively as display math (without numbering).
  text = text.replace(
    /(?<!\$\$\s*)\\begin\{(equation\*?|align\*?|gather\*?|multline\*?)\}([\s\S]*?)\\end\{\1\}(?!\s*\$\$)/g,
    (match) => `\n$$\n${match}\n$$\n`
  );

  return text;
};

const MessageContent = ({ content }: { content: string }) => (
  <div className="markdown-body text-[#e7e7e7] text-[15px] leading-relaxed">
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
      components={{
        p: ({ ...props }) => <p className="mb-3 last:mb-0" {...props} />,
        h1: ({ ...props }) => <h1 className="text-lg font-semibold text-white mt-5 mb-2 first:mt-0" {...props} />,
        h2: ({ ...props }) => <h2 className="text-base font-semibold text-white mt-4 mb-2 first:mt-0" {...props} />,
        h3: ({ ...props }) => <h3 className="text-[15px] font-semibold text-white mt-3 mb-1.5 first:mt-0" {...props} />,
        ul: ({ ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1 last:mb-0" {...props} />,
        ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1 last:mb-0" {...props} />,
        li: ({ ...props }) => <li className="pl-1" {...props} />,
        strong: ({ ...props }) => <strong className="text-white font-semibold" {...props} />,
        em: ({ ...props }) => <em className="text-[#e7e7e7]" {...props} />,
        hr: () => <hr className="border-white/10 my-4" />,
        blockquote: ({ ...props }) => (
          <blockquote className="border-l-2 border-white/20 pl-3 my-3 text-[#aaa] italic" {...props} />
        ),
        a: ({ ...props }) => (
          <a className="underline decoration-white/30 hover:text-white" target="_blank" rel="noopener noreferrer" {...props} />
        ),
        code: ({ className, children, ...props }: any) => {
          const isBlock = /language-/.test(className || '') || String(children).includes('\n');
          if (isBlock) {
            return (
              <pre className="bg-[#0d0d0d] border border-white/10 rounded-xl p-3 overflow-x-auto mb-3 text-[13px]">
                <code className={className} {...props}>{children}</code>
              </pre>
            );
          }
          return (
            <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-[13px] text-[#f0f0f0]" {...props}>
              {children}
            </code>
          );
        },
        table: ({ ...props }) => (
          <div className="overflow-x-auto mb-3 rounded-lg border border-white/10">
            <table className="border-collapse w-full text-sm" {...props} />
          </div>
        ),
        thead: ({ ...props }) => <thead className="bg-white/5" {...props} />,
        th: ({ ...props }) => <th className="px-3 py-2 text-left font-semibold text-white border-b border-white/10" {...props} />,
        td: ({ ...props }) => <td className="px-3 py-2 border-b border-white/5" {...props} />,
      }}
    >
      {normalizeLatexForRendering(content)}
    </ReactMarkdown>
  </div>
);
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AIChat() {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  // Greeting heading
  const [greeting, setGreeting] = useState<string>(pickFallbackGreeting);

  // Voice / recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mutedMessages, setMutedMessages] = useState<Set<string>>(new Set());

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const hasMessages = messages.length > 0;

  // ─── EFFECTS ──────────────────────────────────────────────────────────────

  useEffect(() => {
    loadUserProfile();
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (logoRef.current && messages.length === 0) {
      gsap.fromTo(logoRef.current,
        { opacity: 0, y: 16, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }
      );
    }
  }, [messages.length]);

  useEffect(() => {
    let cancelled = false;

    const fetchGreeting = async () => {
      try {
        const response = await fetch('https://rookie-backend.vercel.app/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message:
              'Write one short, warm welcome-back line (max 8 words, no quotes) for a user opening their FRIDAY AI assistant. Respond with only the line, nothing else.',
            conversationId: null,
            personaId: PERSONAS[0].id,
            personaName: PERSONAS[0].name,
            personaSystemPrompt:
              'You generate a single extremely short (max 8 words) friendly welcome-back greeting. Respond with only the greeting text — no preamble, no quotes, no punctuation beyond one period or emoji.',
            history: [],
            userName: null,
          }),
        });

        if (!response.ok) throw new Error(`Greeting request failed: ${response.status}`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader on greeting response');

        let accumulated = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) accumulated += parsed.content;
              } catch {}
            }
          }
        }

        const cleaned = accumulated.trim().replace(/^["']|["']$/g, '');
        if (!cancelled && cleaned) setGreeting(cleaned);
      } catch (err) {
        console.error('Greeting fetch error:', err);
      }
    };

    fetchGreeting();
    return () => { cancelled = true; };
  }, []);

  const accentColor = selectedPersona.accent;

  // ─── SUPABASE ─────────────────────────────────────────────────────────────

  const loadUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) { console.warn('No authenticated user found'); return; }

      const { data, error } = await supabase
        .from('users')
        .select("id, email, name, avatar_url")
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) setUserProfile(data);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Failed to load user profile');
    }
  };

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('ai_conversations')
        .select('id, title, updated_at, persona_id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30);
      if (data) setConversations(data);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      const { data } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
          persona: m.persona_name,
        })));
      }

      const conv = conversations.find(c => c.id === convId);
      if (conv) {
        const persona = PERSONAS.find(p => p.id === conv.persona_id) || PERSONAS[0];
        setSelectedPersona(persona);
      }
      setActiveConversationId(convId);
      setMobileSidebarOpen(false);
    } catch (err) {
      console.error('Error loading conversation:', err);
    }
  };

  const createNewConversation = async (firstMessage: string, personaId: number): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '...' : '');
      const { data } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, title, persona_id: personaId })
        .select()
        .single();
      if (data) {
        setConversations(prev => [data, ...prev]);
        return data.id;
      }
      return null;
    } catch (err) {
      console.error('Error creating conversation:', err);
      return null;
    }
  };

  const saveMessage = async (convId: string, role: 'user' | 'assistant', content: string) => {
    try {
      await supabase.from('ai_messages').insert({
        conversation_id: convId,
        role,
        content,
        persona_name: selectedPersona.name,
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  };

  const deleteConversation = useCallback(async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from('ai_messages').delete().eq('conversation_id', convId);
      await supabase.from('ai_conversations').delete().eq('id', convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  }, [activeConversationId]);

  // ─── CHAT SEND ────────────────────────────────────────────────────────────

  const handleSend = useCallback(async (overrideText?: string) => {
    const trimmed = (overrideText || input).trim();
    if (!trimmed || isLoading) return;

    setError(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    let convId = activeConversationId;
    if (!convId) {
      convId = await createNewConversation(trimmed, selectedPersona.id);
      if (convId) setActiveConversationId(convId);
    }

    if (convId) await saveMessage(convId, 'user', trimmed);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('https://rookie-backend.vercel.app/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: convId,
          personaId: selectedPersona.id,
          personaName: selectedPersona.name,
          personaSystemPrompt: `${selectedPersona.systemPrompt}\n\n${MATH_FORMATTING_INSTRUCTIONS}`,
          history: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
          userName: userProfile?.name || null,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let accumulated = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content' && parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              } else if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
            } catch {}
          }
        }
      }

      // Fetch TTS audio for AI response
      let audioUrl: string | undefined;
      try {
        const ttsRes = await fetch('https://rookie-backend.vercel.app/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: accumulated }),
        });
        if (ttsRes.ok) {
          const audioBlob = await ttsRes.blob();
          audioUrl = URL.createObjectURL(audioBlob);
        }
      } catch (ttsErr) {
        console.error('TTS error:', ttsErr);
      }

      const aiMsgId = crypto.randomUUID();
      const aiMsg: Message = {
        id: aiMsgId,
        role: 'assistant',
        content: accumulated,
        timestamp: new Date(),
        persona: selectedPersona.name,
        audioUrl,
      };

      setMessages(prev => [...prev, aiMsg]);
      setStreamingContent('');

      // Auto-play AI audio
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioElementsRef.current.set(aiMsgId, audio);
        audio.play().catch(() => {});
      }

      if (convId && accumulated) {
        await saveMessage(convId, 'assistant', accumulated);
        await supabase.from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId);
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err);
        setError(err.message || 'Something went wrong.');
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
          persona: selectedPersona.name,
        }]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [input, isLoading, activeConversationId, messages, selectedPersona, userProfile]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    if (streamingContent) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: streamingContent,
        timestamp: new Date(),
        persona: selectedPersona.name,
      }]);
    }
    setStreamingContent('');
    setIsLoading(false);
  };

  const handleRegenerate = useCallback(async (assistantMsgId: string) => {
    const idx = messages.findIndex(m => m.id === assistantMsgId);
    if (idx <= 0 || isLoading) return;
    const priorUserMsg = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user');
    if (!priorUserMsg) return;

    setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
    setError(null);
    setIsLoading(true);
    setStreamingContent('');

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch('https://rookie-backend.vercel.app/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: priorUserMsg.content,
          conversationId: activeConversationId,
          personaId: selectedPersona.id,
          personaName: selectedPersona.name,
          personaSystemPrompt: selectedPersona.systemPrompt,
          history: messages.slice(0, idx).slice(-12).map(m => ({ role: m.role, content: m.content })),
          userName: userProfile?.name || null,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let accumulated = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
            } catch {}
          }
        }
      }

      let audioUrl: string | undefined;
      try {
        const ttsRes = await fetch('https://rookie-backend.vercel.app/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: accumulated }),
        });
        if (ttsRes.ok) audioUrl = URL.createObjectURL(await ttsRes.blob());
      } catch (ttsErr) {
        console.error('TTS error:', ttsErr);
      }

      const newId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: newId,
        role: 'assistant',
        content: accumulated,
        timestamp: new Date(),
        persona: selectedPersona.name,
        audioUrl,
      }]);
      setStreamingContent('');

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioElementsRef.current.set(newId, audio);
        audio.play().catch(() => {});
      }

      if (activeConversationId && accumulated) {
        await saveMessage(activeConversationId, 'assistant', accumulated);
        await supabase.from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeConversationId);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Regenerate error:', err);
        setError(err.message || 'Could not regenerate that response.');
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [messages, activeConversationId, selectedPersona, userProfile, isLoading]);

  // ─── VOICE RECORDING ──────────────────────────────────────────────────────

  const handleVoiceInput = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const res = await fetch('https://rookie-backend.vercel.app/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
          const { text } = await res.json();

          if (text?.trim()) {
            handleSend(text.trim());
          }
        } catch (err: any) {
          console.error('Transcription error:', err);
          setError('Could not transcribe audio. Please try again.');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow mic access in your browser.');
      } else {
        setError('Could not access microphone.');
      }
      console.error('Mic error:', err);
    }
  }, [isRecording, handleSend]);

  // ─── AUDIO MUTE TOGGLE ────────────────────────────────────────────────────

  const handleToggleMute = useCallback((msgId: string) => {
    const audio = audioElementsRef.current.get(msgId);
    setMutedMessages(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
        if (audio) {
          audio.muted = false;
          audio.play().catch(() => {});
        }
      } else {
        next.add(msgId);
        if (audio) audio.muted = true;
      }
      return next;
    });
  }, []);

  // ─── FEEDBACK ───────────────────────────────────────────────────────────────

  const handleFeedback = useCallback((msgId: string, value: Feedback) => {
    setFeedback(prev => ({ ...prev, [msgId]: prev[msgId] === value ? undefined as any : value }));
  }, []);

  // ─── COPY ─────────────────────────────────────────────────────────────────

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── MISC ─────────────────────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setInput('');
    setStreamingContent('');
    setMobileSidebarOpen(false);
    setError(null);
    setGreeting(pickFallbackGreeting());
    inputRef.current?.focus();
  }, []);

  const getAvatarInitial = () =>
    (userProfile?.name?.[0] || userProfile?.email?.[0] || 'U').toUpperCase();

  const handleLoadConversation = useCallback(loadConversation, [conversations]);
  const handleToggleHistory = useCallback(() => setHistoryOpen(o => !o), []);
  const handleSidebarCollapse = useCallback(() => {
    setSidebarOpen(false);
    setMobileSidebarOpen(false);
  }, []);

  // ─── COMPOSER ───────────────────────────────────────────────────────────

  const renderComposer = () => (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className="flex items-end gap-1.5 pl-3 pr-1.5 py-1.5 rounded-[28px] bg-[#0d0d0d] border border-white/10 focus-within:border-white/20 transition-all"
      >
        <button
          onClick={handleNewChat}
          title="New chat"
          className="text-[#666] hover:text-white transition-colors p-2 flex-shrink-0 self-center"
        >
          <PlusIcon />
        </button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder={
            isRecording
              ? 'Recording… tap to stop'
              : isTranscribing
              ? 'Transcribing…'
              : `How can I help you today?`
          }
          rows={1}
          className="flex-1 bg-transparent text-white text-[15px] placeholder-[#666] resize-none outline-none leading-relaxed py-2"
          style={{ minHeight: '24px', maxHeight: '160px' }}
        />

        <div className="flex items-center gap-1 flex-shrink-0 self-center">
          <button
            onClick={() => setShowPersonaModal(true)}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-full border border-white/10 bg-white/5 text-[#ccc] hover:text-white hover:border-white/20 transition-all text-xs font-medium flex-shrink-0"
            title="Switch persona"
          >
            <span className="text-sm leading-none">{selectedPersona.avatar}</span>
            <span className="hidden sm:inline max-w-[92px] truncate">{selectedPersona.name}</span>
            <ChevronIcon open={showPersonaModal} />
          </button>

          <button
            onClick={isLoading ? handleStop : input.trim() ? () => handleSend() : handleVoiceInput}
            disabled={isTranscribing}
            title={isLoading ? 'Stop' : input.trim() ? 'Send' : isRecording ? 'Stop recording' : 'Record voice message'}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 ${
              isLoading
                ? 'bg-white/10 text-white hover:bg-white/20'
                : isRecording
                ? 'bg-red-500 text-white'
                : input.trim()
                ? 'text-black'
                : 'bg-white text-black hover:bg-white/90'
            }`}
            style={!isLoading && !isRecording && input.trim() ? { background: accentColor } : undefined}
          >
            {isLoading ? <StopIcon /> : input.trim() ? <SendIcon /> : <WaveformIcon />}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#000000] text-white overflow-hidden font-['Inter',sans-serif]">

      {/* DESKTOP SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="hidden md:block flex-shrink-0 bg-[#000000] border-r border-[#2A2A2A] overflow-hidden"
          >
            <Sidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              userProfile={userProfile}
              historyOpen={historyOpen}
              onNewChat={handleNewChat}
              onLoadConversation={handleLoadConversation}
              onDeleteConversation={deleteConversation}
              onToggleHistory={handleToggleHistory}
              onCollapse={handleSidebarCollapse}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MOBILE SIDEBAR */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black z-40"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[260px] bg-[#000000] border-r border-[#2A2A2A] z-50"
            >
              <Sidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                userProfile={userProfile}
                historyOpen={historyOpen}
                onNewChat={handleNewChat}
                onLoadConversation={handleLoadConversation}
                onDeleteConversation={deleteConversation}
                onToggleHistory={handleToggleHistory}
                onCollapse={handleSidebarCollapse}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#000000]">

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 h-12 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSidebarOpen(o => !o); setMobileSidebarOpen(o => !o); }}
              className="text-[#666] hover:text-white transition-colors p-1"
            >
              {sidebarOpen ? <CollapseIcon /> : <MenuIcon />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isRecording && (
              <motion.div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Recording…
              </motion.div>
            )}
            {isTranscribing && (
              <span className="text-xs text-[#666] px-3">Transcribing…</span>
            )}
          </div>
        </header>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 bg-red-500/10 border-t border-b border-red-500/20 text-red-300 text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-4">✕</button>
          </motion.div>
        )}

        {/* Chat column: messages (when present) + composer, which docks to
            the bottom once the conversation starts and floats centered
            beforehand. */}
        <div className="flex-1 flex flex-col min-h-0">

          {hasMessages && (
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6" style={{ scrollbarWidth: 'none' }}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.role === 'user' ? (
                      <div className="px-4 py-2.5 rounded-3xl bg-white/10 border border-white/10 text-white text-[15px] leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    ) : (
                      <>
                      <MessageContent content={msg.content} />
                        <div className="flex items-center gap-0.5 -ml-1.5">
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="text-[#555] hover:text-[#ccc] transition-colors p-1.5 rounded-lg hover:bg-white/5"
                            title="Copy"
                          >
                            {copiedId === msg.id ? <span className="text-[10px] text-green-400 px-0.5">Copied</span> : <CopyIcon />}
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, 'up')}
                            className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${feedback[msg.id] === 'up' ? 'text-white' : 'text-[#555] hover:text-[#ccc]'}`}
                            title="Good response"
                          >
                            <ThumbsUpIcon filled={feedback[msg.id] === 'up'} />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, 'down')}
                            className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${feedback[msg.id] === 'down' ? 'text-white' : 'text-[#555] hover:text-[#ccc]'}`}
                            title="Bad response"
                          >
                            <ThumbsDownIcon filled={feedback[msg.id] === 'down'} />
                          </button>
                          <button
                            onClick={() => handleRegenerate(msg.id)}
                            disabled={isLoading}
                            className="text-[#555] hover:text-[#ccc] transition-colors p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"
                            title="Retry"
                          >
                            <RetryIcon />
                          </button>
                          {msg.audioUrl && (
                            <button
                              onClick={() => handleToggleMute(msg.id)}
                              className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${mutedMessages.has(msg.id) ? 'text-[#555] hover:text-[#ccc]' : 'text-[#FF6B35] hover:text-[#FF8C5A]'}`}
                              title={mutedMessages.has(msg.id) ? 'Unmute' : 'Mute'}
                            >
                              <VolumeIcon muted={mutedMessages.has(msg.id)} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}

              {(isLoading || streamingContent) && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                  <div className="max-w-[85%] sm:max-w-[70%]">
                  {streamingContent ? (
  <div className="relative">
    <MessageContent content={streamingContent} />
    <motion.span
      className="inline-block w-0.5 h-4 align-middle"
      style={{ background: accentColor }}
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.6, repeat: Infinity }}
    />
  </div>
) : (
  <TypingIndicator color={accentColor} />
)}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Composer stage: centered hero before the first message, docked
              to the bottom afterward. `layout` lets framer-motion animate
              the transition between the two positions. */}
         {hasMessages ? (
  // Docked state: just the composer, no stage wrapper, no hero content.
  <div className="flex-shrink-0 w-full px-4 pb-6 pt-3">
    {renderComposer()}
  </div>
) : (
  // Hero state: centered greeting + aurora + composer + suggestion chips.
  <motion.div
    layout
    transition={{ type: 'spring', stiffness: 300, damping: 32 }}
    className="flex-1 w-full flex flex-col items-center justify-center px-4 pb-16 relative"
  >
    <AuroraBackground accent={accentColor} />

    <div className="relative z-10 w-full flex flex-col items-center">
      <div ref={logoRef} className="text-center mb-7 px-4 opacity-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#555] mb-2">
          {selectedPersona.name}
        </p>
        <h1 className="text-[26px] sm:text-[32px] md:text-[38px] font-semibold text-white leading-snug max-w-xl mx-auto">
          {greeting}
        </h1>
      </div>

      {renderComposer()}

      <div className="flex gap-2 flex-wrap justify-center mt-4 max-w-2xl mx-auto">
        {['What can you help me with?', 'Tell me about yourself', "Let's chat"].map(s => (
          <button
            key={s}
            onClick={() => handleSend(s)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[#999] hover:text-white hover:bg-white/8 text-xs transition-all"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  </motion.div>
)}
        </div>
      </div>

      {/* PERSONA MODAL */}
      <AnimatePresence>
        {showPersonaModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => setShowPersonaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-white font-bold text-lg mb-1">Choose Persona</h2>
              <p className="text-[#555] text-xs mb-5">Switch your AI's personality and voice</p>
              <div className="space-y-2">
                {PERSONAS.map(persona => (
                  <motion.button
                    key={persona.id}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedPersona(persona);
                      setShowPersonaModal(false);
                      handleNewChat();
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all text-left ${
                      selectedPersona.id === persona.id
                        ? 'border-white/20 bg-white/8'
                        : 'border-white/5 hover:border-white/10 hover:bg-white/4'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${persona.accent}22`, border: `1px solid ${persona.accent}44` }}
                    >
                      {persona.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">{persona.name}</span>
                        {selectedPersona.id === persona.id && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${persona.accent}22`, color: persona.accent }}>
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[#555] text-xs mt-0.5 truncate">{persona.description}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: persona.accent }} />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
  ::-webkit-scrollbar { display: none; }
  * { -ms-overflow-style: none; scrollbar-width: none; }

  /* KaTeX renders black by default — bring it in line with the dark theme */
  .markdown-body .katex { color: #e7e7e7; font-size: 1.05em; }
  .markdown-body .katex-display { margin: 0.75rem 0; overflow-x: auto; overflow-y: hidden; }
  .markdown-body .katex-display > .katex { text-align: left; }
`}</style>
    </div>
  );
}