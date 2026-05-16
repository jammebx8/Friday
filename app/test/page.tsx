'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/public/src/utils/supabase';
import FridaySidebar from '../components/friday/FridaySidebar';
import VoiceModal from '../components/friday/VoiceModal';
import MessageList from '../components/friday/MessageList';

// ─── TYPES ───────────────────────────────────────────────────────────[...]

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  memory_summary?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
}

// ─── HELPERS ──────────────────────────────────────────────────────────…

function getUserDisplayName(profile: UserProfile | null): string {
  if (!profile) return 'there';
  return profile.name || profile.email?.split('@')[0] || 'there';
}

// ─── ICONS ───────────────────────────────────────────────────────────[...]

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const MicIcon = ({ active }: { active?: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const StopIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

// ─── MAIN PAGE ─────────────────────────────────────────────────────────…

export default function FridayPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [memorySummary, setMemorySummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ─── INIT ──────────────────────────────────────────────────────────…

  useEffect(() => {
    loadUserProfile();
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // ─── SUPABASE ─────────────────────────────────────────────────────────…

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('users').select('id, email, name, avatar_url').eq('id', user.id).single();
      if (data) setUserProfile(data);
    } catch (err) { console.error(err); }
  };

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('friday_conversations')
        .select('id, title, updated_at, memory_summary')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30);
      if (data) setConversations(data);
    } catch (err) { console.error(err); }
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
        })));
      }

      const conv = conversations.find(c => c.id === convId);
      if (conv?.memory_summary) setMemorySummary(conv.memory_summary);

      setActiveConversationId(convId);
    } catch (err) { console.error(err); }
  };

  const createNewConversation = async (firstMessage: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '...' : '');
      const { data } = await supabase.from('friday_conversations').insert({ user_id: user.id, title, memory_summary: '' }).select().single();
      if (data) {
        setConversations(prev => [data, ...prev]);
        return data.id;
      }
      return null;
    } catch (err) { console.error(err); return null; }
  };

  const saveMessage = async (convId: string, role: 'user' | 'assistant', content: string) => {
    try {
      await supabase.from('ai_messages').insert({ conversation_id: convId, role, content });
    } catch (err) { console.error(err); }
  };

  const updateMemorySummary = async (convId: string, allMessages: Message[], newContent: string) => {
    // Build rolling memory summary via API
    try {
      const response = await fetch('/api/friday/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSummary: memorySummary,
          recentMessages: allMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          latestResponse: newContent,
          userName: getUserDisplayName(userProfile),
        }),
      });
      if (response.ok) {
        const { summary } = await response.json();
        setMemorySummary(summary);
        await supabase.from('friday_conversations').update({ memory_summary: summary }).eq('id', convId);
      }
    } catch (err) { console.error('Memory update error:', err); }
  };

  const deleteConversation = async (convId: string) => {
    try {
      await supabase.from('ai_messages').delete().eq('conversation_id', convId);
      await supabase.from('ai_conversations').delete().eq('id', convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([]);
        setMemorySummary('');
      }
    } catch (err) { console.error(err); }
  };

  // ─── SEND ──────────────────────────────────────────────────────────…

  const handleSend = useCallback(async (overrideInput?: string) => {
    const trimmed = (overrideInput ?? input).trim();
    if (!trimmed || isLoading) return;

    setError(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    let convId = activeConversationId;
    if (!convId) {
      convId = await createNewConversation(trimmed);
      if (convId) setActiveConversationId(convId);
    }

    if (convId) await saveMessage(convId, 'user', trimmed);

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch('/api/friday/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: convId,
          memorySummary,
          history: updatedMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
          userName: getUserDisplayName(userProfile),
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
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      setStreamingContent('');

      if (convId) {
        await saveMessage(convId, 'assistant', accumulated);
        await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);
        // Update memory every 4 exchanges
        if (finalMessages.length % 8 === 0 || finalMessages.length <= 4) {
          await updateMemorySummary(convId, finalMessages, accumulated);
        }
      }

      // Auto-speak Friday's response if voice mode was active
      await handleSpeak(accumulated);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err);
        setError(err.message || 'Something went wrong.');
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [input, isLoading, activeConversationId, messages, memorySummary, userProfile]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    if (streamingContent) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: streamingContent,
        timestamp: new Date(),
      }]);
    }
    setStreamingContent('');
    setIsLoading(false);
  };

  // ─── TTS ──────────────────────────────────────────────────────────…

  const handleSpeak = async (text: string) => {
    if (isSpeaking) {
      audioRef.current?.pause();
      setIsSpeaking(false);
      return;
    }
    try {
      setIsSpeaking(true);
      const response = await fetch('/api/friday/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('TTS failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsSpeaking(false);
      audioRef.current.play();
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
    }
  };

  const handleVoiceSubmit = async (transcript: string) => {
    setVoiceModalOpen(false);
    await handleSend(transcript);
  };

  // ─── UI ───────────────────────────────────────────────────────────[...]

  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setInput('');
    setStreamingContent('');
    setMemorySummary('');
    setError(null);
    inputRef.current?.focus();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const userName = getUserDisplayName(userProfile);
  const isEmptyState = messages.length === 0 && !streamingContent;

  return (
    <div className="friday-root">
      {/* Sidebar */}
      <FridaySidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={loadConversation}
        onDeleteConversation={deleteConversation}
        onNewChat={handleNewChat}
        userProfile={userProfile}
        userName={userName}
      />

      {/* Main */}
      <div className={`friday-main ${sidebarOpen ? 'friday-main--sidebar' : ''}`}>

        {/* Header */}
        <header className="friday-header">
          <button className="friday-header__menu" onClick={() => setSidebarOpen(o => !o)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="friday-header__brand">
            <span className="friday-header__dot" />
            <span className="friday-header__name">F.R.I.D.A.Y</span>
          </div>
          <div className="friday-header__status">
            {isSpeaking && (
              <motion.div
                className="friday-speaking-pill"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <span className="friday-speaking-dot" />
                Speaking
              </motion.div>
            )}
          </div>
        </header>

        {/* Messages area */}
        <div className="friday-messages-area">
          {isEmptyState ? (
            <motion.div
              className="friday-empty"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="friday-empty__orb" />
              <h1 className="friday-empty__greeting">
                Good {getTimeOfDay()}, {userName}.
              </h1>
              <p className="friday-empty__sub">I'm Friday. How can I assist you today?</p>
              <div className="friday-empty__suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    className="friday-suggestion"
                    onClick={() => handleSend(s)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <MessageList
              messages={messages}
              streamingContent={streamingContent}
              isLoading={isLoading}
              onSpeak={handleSpeak}
              isSpeaking={isSpeaking}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="friday-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <span>{error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <div className="friday-input-wrap">
          <div className="friday-input-box">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask Friday anything..."
              rows={1}
              className="friday-textarea"
            />
            <div className="friday-input-actions">
              {/* Mic — opens voice modal */}
              <button
                className="friday-btn friday-btn--mic"
                onClick={() => setVoiceModalOpen(true)}
              >
                <MicIcon />
              </button>

              {isLoading ? (
                <button className="friday-btn friday-btn--stop" onClick={handleStop}>
                  <StopIcon />
                </button>
              ) : (
                <motion.button
                  className="friday-btn friday-btn--send"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                >
                  <SendIcon />
                </motion.button>
              )}
            </div>
          </div>
          <p className="friday-input-hint">Friday may make mistakes. Verify important info.</p>
        </div>
      </div>

      {/* Voice Modal */}
      <AnimatePresence>
        {voiceModalOpen && (
          <VoiceModal
            onClose={() => setVoiceModalOpen(false)}
            onSubmit={handleVoiceSubmit}
          />
        )}
      </AnimatePresence>

      <style>{STYLES}</style>
    </div>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const SUGGESTIONS = [
  'Summarize my schedule for today',
  'Research the latest AI breakthroughs',
  'Help me draft a professional email',
  'What should I focus on this week?',
];

const STYLES = `
  :root {
    --friday-bg: #080808;
    --friday-surface: #0e0e0e;
    --friday-border: rgba(255,255,255,0.07);
    --friday-accent: #e8c97e;
    --friday-accent-dim: rgba(232,201,126,0.12);
    --friday-accent-glow: rgba(232,201,126,0.3);
    --friday-text: #f0ece4;
    --friday-muted: #5a5650;
    --friday-sidebar-w: 260px;
    --friday-transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .friday-root {
    display: flex;
    height: 100dvh;
    background: var(--friday-bg);
    color: var(--friday-text);
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow: hidden;
  }

  /* ── MAIN ─────────────────────────────── */
  .friday-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: margin-left var(--friday-transition);
  }

  /* ── HEADER ───────────────────────────── */
  .friday-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--friday-border);
    flex-shrink: 0;
  }
  .friday-header__menu {
    background: none;
    border: none;
    color: var(--friday-muted);
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    transition: color 0.2s, background 0.2s;
    display: flex;
    align-items: center;
  }
  .friday-header__menu:hover { color: var(--friday-text); background: rgba(255,255,255,0.05); }
  .friday-header__brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .friday-header__dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--friday-accent);
    box-shadow: 0 0 8px var(--friday-accent-glow);
    animation: pulse-dot 2s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--friday-accent-glow); }
    50% { opacity: 0.6; box-shadow: 0 0 16px var(--friday-accent-glow); }
  }
  .friday-header__name {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.15em;
    color: var(--friday-accent);
  }
  .friday-header__status { margin-left: auto; }
  .friday-speaking-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--friday-accent-dim);
    border: 1px solid rgba(232,201,126,0.2);
    border-radius: 20px;
    font-size: 11px;
    color: var(--friday-accent);
  }
  .friday-speaking-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--friday-accent);
    animation: pulse-dot 0.8s ease-in-out infinite;
  }

  /* ── MESSAGES ─────────────────────────── */
  .friday-messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 24px 20px;
    scroll-behavior: smooth;
  }
  .friday-messages-area::-webkit-scrollbar { width: 4px; }
  .friday-messages-area::-webkit-scrollbar-track { background: transparent; }
  .friday-messages-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

  /* ── EMPTY STATE ──────────────────────── */
  .friday-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    gap: 12px;
  }
  .friday-empty__orb {
    width: 80px; height: 80px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, rgba(232,201,126,0.35), rgba(232,201,126,0.05) 70%);
    border: 1px solid rgba(232,201,126,0.2);
    margin-bottom: 16px;
    animation: orb-breathe 3s ease-in-out infinite;
  }
  @keyframes orb-breathe {
    0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(232,201,126,0.15); }
    50% { transform: scale(1.05); box-shadow: 0 0 50px rgba(232,201,126,0.25); }
  }
  .friday-empty__greeting {
    font-size: 26px;
    font-weight: 300;
    letter-spacing: -0.02em;
    color: var(--friday-text);
  }
  .friday-empty__sub {
    font-size: 14px;
    color: var(--friday-muted);
    margin-bottom: 24px;
  }
  .friday-empty__suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    max-width: 500px;
  }
  .friday-suggestion {
    background: var(--friday-surface);
    border: 1px solid var(--friday-border);
    color: #999;
    font-size: 13px;
    padding: 8px 14px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .friday-suggestion:hover {
    border-color: rgba(232,201,126,0.3);
    color: var(--friday-accent);
    background: var(--friday-accent-dim);
  }

  /* ── ERROR ────────────────────────────── */
  .friday-error {
    margin: 0 20px 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.2);
    border-radius: 10px;
    font-size: 13px;
    color: #f87171;
  }
  .friday-error button {
    background: none; border: none; color: #f87171; cursor: pointer; opacity: 0.6;
  }

  /* ── INPUT ────────────────────────────── */
  .friday-input-wrap {
    flex-shrink: 0;
    padding: 12px 20px 16px;
    border-top: 1px solid var(--friday-border);
  }
  .friday-input-box {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    background: var(--friday-surface);
    border: 1px solid var(--friday-border);
    border-radius: 16px;
    padding: 12px 14px;
    transition: border-color 0.2s;
  }
  .friday-input-box:focus-within {
    border-color: rgba(232,201,126,0.25);
  }
  .friday-textarea {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    color: var(--friday-text);
    font-size: 14px;
    line-height: 1.6;
    min-height: 24px;
    max-height: 160px;
    font-family: inherit;
  }
  .friday-textarea::placeholder { color: var(--friday-muted); }
  .friday-textarea::-webkit-scrollbar { display: none; }
  .friday-input-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .friday-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 10px;
  }
  .friday-btn--mic {
    width: 34px; height: 34px;
    background: rgba(255,255,255,0.05);
    color: var(--friday-muted);
  }
  .friday-btn--mic:hover {
    background: var(--friday-accent-dim);
    color: var(--friday-accent);
  }
  .friday-btn--send {
    width: 34px; height: 34px;
    background: var(--friday-accent);
    color: #1a1400;
  }
  .friday-btn--send:hover { background: #f0d484; }
  .friday-btn--send:disabled {
    background: rgba(255,255,255,0.07);
    color: var(--friday-muted);
    cursor: not-allowed;
  }
  .friday-btn--stop {
    width: 34px; height: 34px;
    background: rgba(255,255,255,0.1);
    color: var(--friday-text);
  }
  .friday-btn--stop:hover { background: rgba(255,255,255,0.15); }
  .friday-input-hint {
    font-size: 11px;
    color: var(--friday-muted);
    text-align: center;
    margin-top: 8px;
    opacity: 0.6;
  }
`;
