'use client';
// ─── SIDEBAR COMPONENT ───────────────────────────────────────────────────────
// Extracted from page.tsx so chat state changes don't re-render the sidebar.
// Uses React.memo + stable prop references to prevent unnecessary renders.
//
// NOTE: the persona selector used to live here. It has moved into the
// input bar's options row (see AIChat.tsx) so it travels with the composer
// whether it's centered on the empty state or docked at the bottom.
//
// NOTE: the open/close (collapse) control for the whole sidebar drawer now
// lives in the page header as a single toggle button, so it isn't
// duplicated here anymore.

import React, { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  persona_id: number;
  pinned?: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  userProfile: UserProfile | null;
  historyOpen: boolean;
  onNewChat: () => void;
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onToggleHistory: () => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onPinConversation?: (id: string) => void;
  onOpenConversationNewTab?: (id: string) => void;
  loadingConversations?: boolean;
  loadingProfile?: boolean;
}

// ─── ICONS ────────────────────────────────────────────────────────────────────

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

const DotsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const PencilIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
  </svg>
);

const PinIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22"/>
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

// ─── SKELETON HELPERS ────────────────────────────────────────────────────────

const SkeletonBar = ({ width = '100%' }: { width?: string }) => (
  <div
    className="h-3.5 rounded-md bg-white/[0.06] animate-pulse"
    style={{ width }}
  />
);

const ConversationsSkeleton = () => (
  <div className="space-y-3 px-2 pt-1 pb-4">
    {[...Array(7)].map((_, i) => (
      <SkeletonBar key={i} width={`${72 - (i % 3) * 10}%`} />
    ))}
  </div>
);

const ProfileSkeleton = () => (
  <div className="flex items-center gap-3 px-2 py-2">
    <div className="w-9 h-9 rounded-full bg-white/[0.06] animate-pulse flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-1.5">
      <SkeletonBar width="60%" />
      <SkeletonBar width="80%" />
    </div>
  </div>
);

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

const Sidebar = memo(function Sidebar({
  conversations,
  activeConversationId,
  userProfile,
  historyOpen,
  onNewChat,
  onLoadConversation,
  onDeleteConversation,
  onToggleHistory,
  onRenameConversation,
  onPinConversation,
  onOpenConversationNewTab,
  loadingConversations = false,
  loadingProfile = false,
}: SidebarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const getUserDisplayName = () =>
    userProfile?.name || userProfile?.email?.split('@')[0] || 'User';
  const getAvatarInitial = () =>
    (userProfile?.name?.[0] || userProfile?.email?.[0] || 'U').toUpperCase();

  // Close the "…" popup when clicking anywhere outside it.
  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuId]);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  const startRename = (conv: Conversation) => {
    setRenamingId(conv.id);
    setRenameValue(conv.title);
    setOpenMenuId(null);
  };

  const commitRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && onRenameConversation) onRenameConversation(id, trimmed);
    setRenamingId(null);
  };

  // Pinned conversations float to the top, newest-updated first within each group.
  const sortedConversations = [...conversations].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return 0;
  });

  return (
    <div className="flex flex-col h-full font-['Inter',sans-serif]">
      {/* Logo */}
      <div className="flex items-center px-4 pb-4 pt-2">
        <img src="/fridaylogo.jpg" alt="Friday Logo" className="w-32 h-auto object-contain" />
      </div>

      {/* New Chat */}
      <div className="px-3 pb-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[#ccc] hover:text-white hover:bg-white/5 transition-all text-sm font-medium border border-transparent hover:border-white/10"
        >
          <PlusIcon />
          <span>New Chat</span>
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="h-px bg-white/5" />
      </div>

      {/* Conversation history */}
      <div className="flex-1 overflow-y-auto overflow-x-visible px-3" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <button
          onClick={onToggleHistory}
          className="w-full flex items-center justify-between px-2 py-2.5 text-white/90 hover:text-white transition-colors"
        >
          <span className="text-[15px] font-semibold">History</span>
          <ChevronIcon open={historyOpen} />
        </button>

        <AnimatePresence>
          {historyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-visible"
            >
              {loadingConversations ? (
                <ConversationsSkeleton />
              ) : (
                <div className="space-y-0.5 pb-4">
                  {sortedConversations.length === 0 && (
                    <p className="text-[#444] text-xs px-2 py-4 text-center">No conversations yet</p>
                  )}
                  {sortedConversations.map(conv => {
                    const isActive = activeConversationId === conv.id;
                    const isMenuOpen = openMenuId === conv.id;
                    const isRenaming = renamingId === conv.id;
                    return (
                      <motion.div
                        key={conv.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors ${
                          isActive || isMenuOpen
                            ? 'bg-white/10 text-white'
                            : 'text-[#d4d4d4] hover:bg-white/5 hover:text-white'
                        }`}
                        onClick={() => !isRenaming && onLoadConversation(conv.id)}
                      >
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <input
                              ref={renameInputRef}
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitRename(conv.id);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              onBlur={() => commitRename(conv.id)}
                              className="w-full bg-transparent text-[15px] font-medium text-white outline-none border-b border-white/20 pb-0.5"
                            />
                          ) : (
                            <p className="text-[15px] truncate font-medium flex items-center gap-1.5">
                              {conv.pinned && (
                                <span className="text-[#888] flex-shrink-0"><PinIcon /></span>
                              )}
                              {conv.title}
                            </p>
                          )}
                        </div>

                        {!isRenaming && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : conv.id);
                            }}
                            className={`flex-shrink-0 p-1.5 rounded-lg transition-all text-[#999] hover:text-white hover:bg-white/10 ${
                              isMenuOpen ? 'opacity-100 bg-white/10 text-white' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <DotsIcon />
                          </button>
                        )}

                        {/* Popup options menu */}
                        <AnimatePresence>
                          {isMenuOpen && (
                            <motion.div
                              ref={menuRef}
                              initial={{ opacity: 0, scale: 0.96, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.96, y: -4 }}
                              transition={{ duration: 0.12 }}
                              onClick={e => e.stopPropagation()}
                              className="absolute right-1 top-[calc(100%+2px)] w-48 bg-[#262626] border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50"
                            >
                              <button
                                onClick={() => {
                                  onOpenConversationNewTab?.(conv.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[#e5e5e5] hover:bg-white/8 transition-colors text-sm font-medium text-left"
                              >
                                <ExternalLinkIcon />
                                Open new tab
                              </button>
                              <button
                                onClick={() => startRename(conv)}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[#e5e5e5] hover:bg-white/8 transition-colors text-sm font-medium text-left"
                              >
                                <PencilIcon />
                                Rename
                              </button>
                              <button
                                onClick={() => {
                                  onPinConversation?.(conv.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[#e5e5e5] hover:bg-white/8 transition-colors text-sm font-medium text-left"
                              >
                                <PinIcon />
                                {conv.pinned ? 'Unpin' : 'Pin'}
                              </button>
                              <button
                                onClick={(e) => {
                                  onDeleteConversation(conv.id, e as unknown as React.MouseEvent);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium text-left"
                              >
                                <TrashIcon />
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User profile */}
      <div className="px-3 py-3 border-t border-white/10">
        {loadingProfile ? (
          <ProfileSkeleton />
        ) : (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                  {getAvatarInitial()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[15px] font-semibold truncate">{getUserDisplayName()}</p>
              <p className="text-[#8f9bc4] text-[13px] truncate">{userProfile?.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default Sidebar;