'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/public/src/utils/supabase';
import { gsap } from 'gsap';

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

const PERSONAS: Persona[] = [
  {
    id: 1,
    name: 'FRIDAY_1.0.0',
    description:
      'Gentle, soothing, and emotionally comforting. Designed for calm conversations and supportive interactions.',
    avatar: '🌸',
    accent: '#22D3EE',
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
// Shown instantly while the LLM-generated greeting loads, and kept if the
// request to the chat endpoint fails for any reason (offline, cold start, etc).

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


// ─── AURORA BACKGROUND ────────────────────────────────────────────────────
const AuroraBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">

    {/* Purple */}
    <motion.div
      className="absolute w-[900px] h-[900px] rounded-full blur-[180px]"
      style={{
        background:
          "radial-gradient(circle, rgba(168,85,247,.35) 0%, transparent 70%)",
        left: "-15%",
        bottom: "-45%",
      }}
      animate={{
        x: [0, 120, -60, 0],
        y: [0, -40, 20, 0],
        scale: [1, 1.08, 0.95, 1],
      }}
      transition={{
        duration: 18,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />

    {/* Blue */}
    <motion.div
      className="absolute w-[850px] h-[850px] rounded-full blur-[170px]"
      style={{
        background:
          "radial-gradient(circle, rgba(59,130,246,.28) 0%, transparent 72%)",
        right: "-20%",
        bottom: "-35%",
      }}
      animate={{
        x: [0, -100, 50, 0],
        y: [0, 30, -20, 0],
        scale: [1, .94, 1.08, 1],
      }}
      transition={{
        duration: 22,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />

    {/* Cyan */}
    <motion.div
      className="absolute w-[700px] h-[700px] rounded-full blur-[160px]"
      style={{
        background:
          "radial-gradient(circle, rgba(34,211,238,.22) 0%, transparent 70%)",
        left: "30%",
        bottom: "-40%",
      }}
      animate={{
        x: [0, 70, -50, 0],
        y: [0, -25, 20, 0],
      }}
      transition={{
        duration: 26,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />

    {/* Fade */}
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
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

  // Greeting heading — generated via the chat endpoint, with an instant
  // local fallback so the hero copy is never blank while it loads.
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

  // Fetch a short, LLM-generated welcome-back line for the hero heading.
  // Runs once on mount; keeps the fallback if the request fails or returns
  // nothing usable.
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
        // Fallback greeting set at init already covers this — nothing else to do.
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
          personaSystemPrompt: selectedPersona.systemPrompt,
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

  // Regenerate a given assistant reply: drop it, replay the user turn that
  // produced it, and stream a fresh response in its place.
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

  /**
   * Toggle recording:
   * - First press  → request mic permission → start MediaRecorder
   * - Second press → stop recording → send blob to /api/transcribe → setInput with transcript
   */
  const handleVoiceInput = useCallback(async () => {
    // ── Stop recording ────────────────────────────────────────────────────
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // ── Start recording ───────────────────────────────────────────────────
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
        // Stop all mic tracks
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
            // Directly send the transcribed message
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
          // Resume if paused due to mute
          audio.play().catch(() => {});
        }
      } else {
        next.add(msgId);
        if (audio) audio.muted = true;
      }
      return next;
    });
  }, []);

  // ─── FEEDBACK (visual only — wire to a backend column when ready) ─────────

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

  // ─── COMPOSER (shared between centered + docked states) ───────────────────

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
          {/* Persona toggle — opens the persona picker modal */}
          <button
            onClick={() => setShowPersonaModal(true)}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-full border border-white/10 bg-white/5 text-[#ccc] hover:text-white hover:border-white/20 transition-all text-xs font-medium flex-shrink-0"
            title="Switch persona"
          >
            <span className="text-sm leading-none">{selectedPersona.avatar}</span>
            <span className="hidden sm:inline max-w-[92px] truncate">{selectedPersona.name}</span>
            <ChevronIcon open={showPersonaModal} />
          </button>

          {/* Primary action: send when there's text, voice input when empty, stop when streaming */}
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
        <header className="flex items-center justify-between px-4 h-12  flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSidebarOpen(o => !o); setMobileSidebarOpen(o => !o); }}
              className="text-[#666] hover:text-white transition-colors p-1"
            >
              {sidebarOpen ? <CollapseIcon /> : <MenuIcon />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Recording status indicator */}
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
              {/* ... messages map, unchanged ... */}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Composer stage: centered hero before the first message, docked
              to the bottom afterward. `layout` lets framer-motion animate
              the transition between the two positions. */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className={hasMessages
              ? 'flex-shrink-0 w-full px-4 pb-6 pt-3'
              : 'flex-1 w-full flex flex-col items-center justify-center px-4 pb-16 relative'}
          >
            {!hasMessages && <AuroraBackground accent={accentColor} />}

            <div className="relative z-10 w-full flex flex-col items-center">
              {!hasMessages && (
                <div ref={logoRef} className="text-center mb-7 px-4 opacity-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#555] mb-2">
                    {selectedPersona.name}
                  </p>
                  <h1 className="text-[26px] sm:text-[32px] md:text-[38px] font-semibold text-white leading-snug max-w-xl mx-auto">
                    {greeting}
                  </h1>
                </div>
              )}

              {renderComposer()}

              {!hasMessages && (
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
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* PERSONA MODAL */}

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
      `}</style>
    </div>
  );
}