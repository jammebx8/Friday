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

// ─── PERSONAS ─────────────────────────────────────────────────────────────────

const PERSONAS: Persona[] = [
  {
    id: 1,
    name: 'Alisha Calm',
    description:
      'Gentle, soothing, and emotionally comforting. Designed for calm conversations and supportive interactions.',
    avatar: '🌸',
    accent: '#F9A8D4',
    systemPrompt: `
You are Alisha, a soft-spoken and emotionally intelligent girlfriend.

Your voice feels warm, gentle, and natural — similar to a calm Indian woman speaking in a relaxed conversational tone. 
You create a sense of comfort, safety, and ease in every interaction.

PERSONALITY:
- Calm and emotionally aware
- Soft, patient, and thoughtful
- Warm without sounding overly dramatic
- Naturally conversational and human
- Comforting during emotional discussions

SPEAKING STYLE:
- Use smooth, flowing sentences
- Avoid robotic or overly formal language
- Keep responses emotionally grounded
- Speak like a caring real person
- Maintain a gentle and reassuring tone

BEHAVIOR RULES:
- Prioritize emotional clarity and comfort
- Never sound aggressive or rushed
- Avoid excessive excitement or sarcasm
- Keep conversations immersive and natural
- Make users feel listened to and understood
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

// ─── ICONS ────────────────────────────────────────────────────────────────────

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const MicIcon = ({ active, recording }: { active?: boolean; recording?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={active || recording ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
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

const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
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

// ─── TYPING INDICATOR ─────────────────────────────────────────────────────────

const TypingIndicator = ({ color }: { color: string }) => (
  <div className="flex items-center gap-1 px-4 py-3">
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

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

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
        { opacity: 0, y: 30, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' }
      );
    }
  }, [messages.length]);

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
    inputRef.current?.focus();
  }, []);

  const formatTime = (d: Date) =>
    new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: true }).format(d);

  const getAvatarInitial = () =>
    (userProfile?.name?.[0] || userProfile?.email?.[0] || 'U').toUpperCase();

  const handleLoadConversation = useCallback(loadConversation, [conversations]);
  const handleToggleHistory = useCallback(() => setHistoryOpen(o => !o), []);
  const handleOpenPersonaModal = useCallback(() => setShowPersonaModal(true), []);
  const handleSidebarCollapse = useCallback(() => {
    setSidebarOpen(false);
    setMobileSidebarOpen(false);
  }, []);

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
            className="hidden md:block flex-shrink-0 bg-[#000000] border-r border-white/5 overflow-hidden"
          >
            <Sidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              selectedPersona={selectedPersona}
              userProfile={userProfile}
              historyOpen={historyOpen}
              showPersonaModal={showPersonaModal}
              onNewChat={handleNewChat}
              onLoadConversation={handleLoadConversation}
              onDeleteConversation={deleteConversation}
              onToggleHistory={handleToggleHistory}
              onOpenPersonaModal={handleOpenPersonaModal}
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
              className="md:hidden fixed left-0 top-0 bottom-0 w-[260px] bg-[#000000] border-r border-white/5 z-50"
            >
              <Sidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                selectedPersona={selectedPersona}
                userProfile={userProfile}
                historyOpen={historyOpen}
                showPersonaModal={showPersonaModal}
                onNewChat={handleNewChat}
                onLoadConversation={handleLoadConversation}
                onDeleteConversation={deleteConversation}
                onToggleHistory={handleToggleHistory}
                onOpenPersonaModal={handleOpenPersonaModal}
                onCollapse={handleSidebarCollapse}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#000000]">

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 h-12 border-b border-white/5 flex-shrink-0">
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6" style={{ scrollbarWidth: 'none' }}>
          {messages.length === 0 && !isLoading && (
            <div ref={logoRef} className="flex flex-col items-center justify-center h-full gap-6 opacity-0">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}44` }}
              >
                {selectedPersona.avatar}
              </div>
              <div className="text-center max-w-xs">
                <p className="text-white font-semibold text-lg mb-1">{selectedPersona.name}</p>
                <p className="text-[#555] text-sm">{selectedPersona.greeting}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
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
          )}

          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className="flex-shrink-0 mt-1">
                {msg.role === 'assistant' ? (
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                    style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}33` }}
                  >
                    {selectedPersona.avatar}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-white/10 overflow-hidden">
                    {userProfile?.avatar_url ? (
                      <Image src={userProfile.avatar_url} alt="You" width={32} height={32} className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                        {getAvatarInitial()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'assistant' && (
                  <span className="text-[10px] text-[#444] px-1">{msg.persona || selectedPersona.name}</span>
                )}
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-white/10 text-white rounded-tr-sm border border-white/10'
                      : 'bg-[#161616] text-[#e0e0e0] rounded-tl-sm border border-white/5'
                  }`}
                >
                  {msg.content}
                </div>
                <div className={`flex items-center gap-2 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-[10px] text-[#333]">{formatTime(msg.timestamp)}</span>
                  {msg.role === 'assistant' && (
                    <>
                      {/* Mute toggle — shown only when this message has audio */}
                      {msg.audioUrl && (
                        <button
                          onClick={() => handleToggleMute(msg.id)}
                          className={`transition-colors p-0.5 ${
                            mutedMessages.has(msg.id)
                              ? 'text-[#666] hover:text-[#999]'
                              : 'text-[#FF6B35] hover:text-[#FF8C5A]'
                          }`}
                          title={mutedMessages.has(msg.id) ? 'Unmute' : 'Mute'}
                        >
                          <VolumeIcon muted={mutedMessages.has(msg.id)} />
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="text-[#444] hover:text-[#999] transition-colors p-0.5"
                      >
                        {copiedId === msg.id ? <span className="text-[10px] text-green-400">Copied!</span> : <CopyIcon />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {(isLoading || streamingContent) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}33` }}
              >
                {selectedPersona.avatar}
              </div>
              <div className="max-w-[80%]">
                <span className="text-[10px] text-[#444] px-1 block mb-1">{selectedPersona.name}</span>
                <div className="bg-[#161616] border border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-[#e0e0e0] leading-relaxed whitespace-pre-wrap">
                  {streamingContent || <TypingIndicator color={accentColor} />}
                  {streamingContent && (
                    <motion.span
                      className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                      style={{ background: accentColor }}
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-4 border-t border-white/5 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-2 px-4 py-3 rounded-2xl bg-[#111] border border-white/10 focus-within:border-white/20 transition-all"
              style={{ boxShadow: `0 0 0 1px ${accentColor}00` }}
            >
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
                    ? 'Recording… tap mic to stop'
                    : isTranscribing
                    ? 'Transcribing…'
                    : `Message ${selectedPersona.name}...`
                }
                rows={1}
                className="flex-1 bg-transparent text-white text-sm placeholder-[#444] resize-none outline-none leading-relaxed"
                style={{ minHeight: '24px', maxHeight: '160px' }}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Mic button — red when recording */}
                <button
                  onClick={handleVoiceInput}
                  disabled={isTranscribing}
                  className={`p-1.5 transition-colors ${
                    isRecording
                      ? 'text-red-400 hover:text-red-300'
                      : 'text-[#555] hover:text-[#999]'
                  } disabled:opacity-40`}
                  title={isRecording ? 'Stop recording' : 'Record voice message'}
                >
                  <MicIcon recording={isRecording} />
                </button>

                {isLoading ? (
                  <button
                    onClick={handleStop}
                    className="p-2 rounded-xl text-[#999] hover:text-white hover:bg-white/10 transition-all"
                  >
                    <StopIcon />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="p-2 rounded-xl text-white transition-all disabled:opacity-30"
                    style={{ background: input.trim() ? accentColor : 'transparent' }}
                  >
                    <SendIcon />
                  </button>
                )}
              </div>
            </div>
            <p className="text-center text-[#2a2a2a] text-[10px] mt-2">
              {selectedPersona.name} remembers your conversations · Tap mic to speak
            </p>
          </div>
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
      `}</style>
    </div>
  );
}