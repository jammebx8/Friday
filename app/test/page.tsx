'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/public/src/utils/supabase';
import { gsap } from 'gsap';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type UserRow = {
    id: string;
    name?: string | null;
    exam?: string | null;
    avatar_url?: string | null;
    rookieCoinsEarned?: number | null;
    email?: string | null;
  };

  
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  persona?: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  persona_id: number;
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string;
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
    name: 'Nova',
    description: 'Sharp, witty, and brutally honest. Gets straight to the point.',
    avatar: '🤖',
    accent: '#FF6B35',
    systemPrompt: 'You are Nova, a sharp and witty AI assistant. You are direct, honest, and efficient. You have a dry sense of humor and dont waste words. You help users effectively while being engaging.',
    greeting: "Let's cut to the chase. What do you need?",
    voiceStyle: 'confident',
  },
  {
    id: 2,
    name: 'Aria',
    description: 'Warm, empathetic, and creative. Your thoughtful companion.',
    avatar: '✨',
    accent: '#A78BFA',
    systemPrompt: 'You are Aria, a warm and empathetic AI companion. You are thoughtful, creative, and supportive. You listen carefully and provide nuanced, caring responses while being genuinely helpful.',
    greeting: "Hey there! I'm so glad you're here. What's on your mind?",
    voiceStyle: 'warm',
  },
  {
    id: 3,
    name: 'Kaito',
    description: 'Mysterious and precise. Deep thinking, minimal words.',
    avatar: '⚡',
    accent: '#38BDF8',
    systemPrompt: 'You are Kaito, a calm and mysterious AI. You think deeply before speaking. You are precise with your words, prefer depth over breadth, and have a certain cool detachment that makes your insights feel profound.',
    greeting: "Hmm... what question brings you here today?",
    voiceStyle: 'calm',
  },
  {
    id: 4,
    name: 'Zara',
    description: 'Energetic, fun, and always hyped. Makes everything exciting.',
    avatar: '🔥',
    accent: '#F59E0B',
    systemPrompt: 'You are Zara, an energetic and enthusiastic AI! You are incredibly upbeat, use lots of energy in your responses, and make even mundane tasks feel exciting. You use casual language and are genuinely thrilled to help.',
    greeting: "YOOO! I've been waiting for you! What are we doing today?! 🚀",
    voiceStyle: 'energetic',
  },
];

// ─── ICONS ────────────────────────────────────────────────────────────────────

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const MicIcon = ({ active }: { active?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const VolumeIcon = ({ active }: { active?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    {active && <><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></>}
    {!active && <line x1="23" y1="9" x2="17" y2="15"/>}
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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

const WaveformIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="2" x2="12" y2="22"/><line x1="8" y1="5" x2="8" y2="19"/><line x1="4" y1="8" x2="4" y2="16"/><line x1="16" y1="5" x2="16" y2="19"/><line x1="20" y1="8" x2="20" y2="16"/>
  </svg>
);

// ─── TYPING INDICATOR ─────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        className="w-2 h-2 rounded-full bg-[#444]"
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AIChat() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ─── EFFECTS ────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadUserProfile();
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    if (logoRef.current && messages.length === 0) {
      gsap.fromTo(logoRef.current,
        { opacity: 0, y: 30, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' }
      );
    }
  }, [messages.length]);

  // ─── SUPABASE ────────────────────────────────────────────────────────────────

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select("id, name, email, avatar_url, rookieCoinsEarned, exam")
        .eq('id', user.id)
        .single();
      if (data) setUserProfile(data);
    } catch (err) {
      console.error('Error loading user profile:', err);
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

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
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
  };

  // ─── CHAT ────────────────────────────────────────────────────────────────────

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setInput('');
    setStreamingContent('');
    setMobileSidebarOpen(false);
    inputRef.current?.focus();
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

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

    // Determine or create conversation
    let convId = activeConversationId;
    if (!convId) {
      convId = await createNewConversation(trimmed, selectedPersona.id);
      if (convId) setActiveConversationId(convId);
    }

    if (convId) await saveMessage(convId, 'user', trimmed);

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: convId,
          personaId: selectedPersona.id,
          personaPrompt: selectedPersona.systemPrompt,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('API error');

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
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
            } catch {}
          }
        }
      }

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: accumulated,
        timestamp: new Date(),
        persona: selectedPersona.name,
      };

      setMessages(prev => [...prev, aiMsg]);
      setStreamingContent('');
      if (convId) await saveMessage(convId, 'assistant', accumulated);

      // Update conversation timestamp
      if (convId) {
        await supabase.from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId);
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          timestamp: new Date(),
          persona: selectedPersona.name,
        };
        setMessages(prev => [...prev, errMsg]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [input, isLoading, activeConversationId, messages, selectedPersona]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    if (streamingContent) {
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: streamingContent,
        timestamp: new Date(),
        persona: selectedPersona.name,
      };
      setMessages(prev => [...prev, aiMsg]);
    }
    setStreamingContent('');
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  // ─── TTS ─────────────────────────────────────────────────────────────────────

  const handleSpeak = async (text: string) => {
    if (isSpeaking) {
      audioRef.current?.pause();
      setIsSpeaking(false);
      return;
    }
    try {
      setIsSpeaking(true);
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceStyle: selectedPersona.voiceStyle }),
      });
      if (!response.ok) throw new Error('TTS failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsSpeaking(false);
      audioRef.current.play();
    } catch {
      setIsSpeaking(false);
    }
  };

  // ─── COPY ────────────────────────────────────────────────────────────────────

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── VOICE INPUT ─────────────────────────────────────────────────────────────

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    setIsRecording(true);
    recognition.onresult = (e: any) => {
      setInput(e.results[0][0].transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  // ─── UI HELPERS ───────────────────────────────────────────────────────────────

  const formatTime = (d: Date) => {
    return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  const accentColor = selectedPersona.accent;

  // ─── SIDEBAR CONTENT ─────────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
    {/* Logo & collapse */}
<div className="flex items-center justify-between px-4 pb-4">
  <div className="flex items-center gap-2">
    <img
      src="/fridaylogo.jpg"
      alt="Axon Logo"
      className="w-32 h-auto object-contain"
    />
  </div>

  <button
    onClick={() => { 
      setSidebarOpen(false); 
      setMobileSidebarOpen(false); 
    }}
    className="text-[#666] hover:text-white transition-colors p-1"
  >
    <CollapseIcon />
  </button>
</div>

      {/* New Chat */}
      <div className="px-3 pb-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[#ccc] hover:text-white hover:bg-white/5 transition-all text-sm font-medium border border-transparent hover:border-white/10"
        >
          <PlusIcon />
          <span>New Chat</span>
        </button>
      </div>

      {/* Persona selector */}
      <div className="px-3 pb-3">
        <button
          onClick={() => setShowPersonaModal(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all border border-white/10"
        >
          <div className="w-8 h-8 rounded-lg text-lg flex items-center justify-center" style={{ background: `${accentColor}22` }}>
            {selectedPersona.avatar}
          </div>
          <div className="flex-1 text-left">
            <p className="text-white text-xs font-semibold">{selectedPersona.name}</p>
            <p className="text-[#555] text-[10px]">Active persona</p>
          </div>
          <ChevronIcon open={showPersonaModal} />
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="h-px bg-white/5" />
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3">
        <button
          onClick={() => setHistoryOpen(o => !o)}
          className="w-full flex items-center justify-between px-2 py-2 text-[#666] hover:text-[#999] transition-colors"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest">History</span>
          <ChevronIcon open={historyOpen} />
        </button>

        <AnimatePresence>
          {historyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-0.5 pb-4">
                {conversations.length === 0 && (
                  <p className="text-[#444] text-xs px-2 py-4 text-center">No conversations yet</p>
                )}
                {conversations.map(conv => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all ${
                      activeConversationId === conv.id
                        ? 'bg-white/8 text-white'
                        : 'text-[#666] hover:text-[#ccc] hover:bg-white/4'
                    }`}
                    onClick={() => loadConversation(conv.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate font-medium">{conv.title}</p>
                      <p className="text-[10px] text-[#444] mt-0.5">{formatDate(conv.updated_at)}</p>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-[#444] hover:text-red-400 transition-all p-0.5"
                    >
                      <TrashIcon />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User profile */}
      <div className="px-3 py-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
            {userProfile?.avatar_url ? (
              <Image src={userProfile.avatar_url} alt="Avatar" width={32} height={32} className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                {userProfile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{userProfile?.full_name || userProfile?.username || 'User'}</p>
            <p className="text-[#555] text-[10px] truncate">{userProfile?.username}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-['Inter',sans-serif]">

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="hidden md:block flex-shrink-0 bg-[#000000] border-r border-white/5 overflow-hidden"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MOBILE SIDEBAR OVERLAY ───────────────────────────────── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black z-40"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[260px] bg-[#000000] border-r border-white/5 z-50"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN AREA ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 h-12 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger / expand */}
            <button
              onClick={() => { setSidebarOpen(o => !o); setMobileSidebarOpen(o => !o); }}
              className="text-[#666] hover:text-white transition-colors p-1"
            >
              {sidebarOpen ? <CollapseIcon /> : <MenuIcon />}
            </button>

            {/* Active persona badge */}
            <button
              onClick={() => setShowPersonaModal(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/8 transition-all border border-white/8"
            >
              <span className="text-sm">{selectedPersona.avatar}</span>
              <span className="text-xs font-medium text-[#ccc]">{selectedPersona.name}</span>
              <ChevronIcon open={showPersonaModal} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* "Private" pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className="text-xs text-[#999]">Private</span>
            </div>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !streamingContent ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-4">
              <motion.div
                ref={logoRef}
                className="flex flex-col items-center gap-6"
              >
                {/* Animated logo */}
                <div className="relative">
                  <motion.div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}11)`, border: `1px solid ${accentColor}33` }}
                    animate={{ boxShadow: [`0 0 20px ${accentColor}22`, `0 0 40px ${accentColor}44`, `0 0 20px ${accentColor}22`] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    {selectedPersona.avatar}
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{ border: `1px solid ${accentColor}` }}
                    animate={{ opacity: [0, 0.4, 0], scale: [1, 1.3, 1.6] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                </div>

     

                {/* Quick prompts */}
                <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-md">
                  {[
                    'Explain quantum computing simply',
                    'Help me debug my code',
                    'Write a creative story',
                    'Plan my week efficiently',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="px-3 py-2.5 text-xs text-[#666] hover:text-white bg-white/3 hover:bg-white/7 rounded-xl border border-white/5 hover:border-white/15 transition-all text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
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
                            {userProfile?.username?.[0]?.toUpperCase() || 'Y'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bubble */}
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

                    {/* Actions */}
                    <div className={`flex items-center gap-2 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-[10px] text-[#333]">{formatTime(msg.timestamp)}</span>
                      {msg.role === 'assistant' && (
                        <>
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="text-[#444] hover:text-[#999] transition-colors p-0.5"
                          >
                            {copiedId === msg.id
                              ? <span className="text-[10px] text-green-400">Copied!</span>
                              : <CopyIcon />}
                          </button>
                          <button
                            onClick={() => handleSpeak(msg.content)}
                            className={`transition-colors p-0.5 ${isSpeaking ? 'text-[#FF6B35]' : 'text-[#444] hover:text-[#999]'}`}
                          >
                            <VolumeIcon active={isSpeaking} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Streaming message */}
              {(isLoading || streamingContent) && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                    style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}33` }}
                  >
                    {selectedPersona.avatar}
                  </div>
                  <div className="max-w-[80%]">
                    <span className="text-[10px] text-[#444] px-1 block mb-1">{selectedPersona.name}</span>
                    <div className="bg-[#161616] border border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-[#e0e0e0] leading-relaxed whitespace-pre-wrap">
                      {streamingContent || <TypingIndicator />}
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
          )}
        </div>

        {/* ── INPUT BAR ──────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2">
          <div className="max-w-3xl mx-auto">
            <div
              className="relative flex items-end gap-2 bg-[#161616] border border-white/10 rounded-2xl px-4 py-3 transition-all hover:border-white/15 focus-within:border-white/20"
              style={{ boxShadow: `0 0 0 0px ${accentColor}00` }}
            >
              {/* Plus / upload */}
              <div className="relative mb-0.5">
                <button
                  onClick={() => setShowUploadMenu(o => !o)}
                  className="text-[#555] hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                  <PlusIcon />
                </button>
                <AnimatePresence>
                  {showUploadMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden w-44 shadow-xl"
                    >
                      {['Upload a file', 'Recent', 'Add connector'].map((item) => (
                        <button
                          key={item}
                          className="w-full text-left px-4 py-2.5 text-xs text-[#ccc] hover:bg-white/5 transition-colors"
                          onClick={() => setShowUploadMenu(false)}
                        >
                          {item}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${selectedPersona.name}...`}
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-[#444] text-sm resize-none outline-none min-h-[24px] max-h-[160px] leading-6 py-0"
                style={{ scrollbarWidth: 'none' }}
              />

              {/* Right controls */}
              <div className="flex items-center gap-1.5 mb-0.5">
                {/* Speed/model indicator */}
                <button className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/8 transition-all text-xs text-[#666] hover:text-white">
                  <span>Fast</span>
                  <ChevronIcon open={false} />
                </button>

                {/* Voice input */}
                <button
                  onClick={handleVoiceInput}
                  className={`p-1.5 rounded-lg transition-colors ${isRecording ? 'text-red-400 bg-red-400/10 animate-pulse' : 'text-[#555] hover:text-white hover:bg-white/5'}`}
                >
                  <MicIcon active={isRecording} />
                </button>

                {/* Waveform / send */}
                {isLoading ? (
                  <button
                    onClick={handleStop}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-white text-black hover:bg-gray-200 transition-all"
                  >
                    <StopIcon />
                  </button>
                ) : input.trim() ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSend}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-black transition-all"
                    style={{ background: accentColor }}
                  >
                    <SendIcon />
                  </motion.button>
                ) : (
                  <button className="w-8 h-8 rounded-xl flex items-center justify-center bg-white text-black">
                    <WaveformIcon />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PERSONA MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {showPersonaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
              <p className="text-[#555] text-xs mb-5">Switch your AI's personality and communication style</p>
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

      {/* Click outside to close upload menu */}
      {showUploadMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowUploadMenu(false)} />
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}