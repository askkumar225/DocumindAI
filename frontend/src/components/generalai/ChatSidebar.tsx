/**
 * ChatSidebar.tsx — Left sidebar for General AI.
 *
 * Features:
 *  • ✦ GENERAL AI brand + "← Hub" back button
 *  • + New Chat button
 *  • Search/filter input
 *  • Conversation history grouped by Today / Yesterday / This week / This month / Older
 *  • Hover-to-show delete button
 *  • Double-click to rename (inline edit)
 *  • Active conversation highlight
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AIConversationListItem } from "../../types/ai";

// ─── Date grouping ────────────────────────────────────────────────────────────

function dateGroup(iso: string): string {
  const d    = new Date(iso);
  const now  = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff  = Math.floor(
    (today.getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000
  );
  if (diff === 0)  return "Today";
  if (diff === 1)  return "Yesterday";
  if (diff < 7)   return "This week";
  if (diff < 30)  return "This month";
  return "Older";
}

const GROUP_ORDER = ["Today", "Yesterday", "This week", "This month", "Older"];

function groupConversations(convs: AIConversationListItem[]) {
  const map: Record<string, AIConversationListItem[]> = {};
  for (const c of convs) {
    const g = dateGroup(c.updated_at);
    if (!map[g]) map[g] = [];
    map[g].push(c);
  }
  return GROUP_ORDER
    .filter((g) => map[g])
    .map((g) => ({ group: g, items: map[g] }));
}

// ─── Single conversation row ──────────────────────────────────────────────────

interface ConvItemProps {
  conv: AIConversationListItem;
  active: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onRename: (newTitle: string) => void;
}

function ConvItem({ conv, active, onSelect, onDelete, onRename }: ConvItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(conv.title);

  function commit() {
    setEditing(false);
    const t = draft.trim();
    if (t && t !== conv.title) onRename(t);
    else setDraft(conv.title);
  }

  return (
    <div
      onClick={() => !editing && onSelect()}
      className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                  cursor-pointer select-none transition-all duration-200 text-sm
                  ${active
                    ? "bg-indigo-600/20 border border-indigo-500/30 text-white"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
                  }`}
    >
      <span className="text-base flex-shrink-0 opacity-60">💬</span>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter")  commit();
            if (e.key === "Escape") { setEditing(false); setDraft(conv.title); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-slate-900 border border-indigo-500/50 rounded-lg
                     px-2 py-0.5 text-xs text-white outline-none min-w-0"
        />
      ) : (
        <>
          <span
            className="flex-1 truncate font-medium min-w-0"
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
            title={conv.title}
          >
            {conv.title}
          </span>

          {/* Delete — appears on hover */}
          <button
            onClick={onDelete}
            title="Delete conversation"
            className="flex-shrink-0 opacity-0 group-hover:opacity-100
                       w-5 h-5 flex items-center justify-center rounded
                       text-slate-600 hover:text-red-400
                       transition-all duration-150 text-xs"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}

// ─── ChatSidebar ─────────────────────────────────────────────────────────────

interface ChatSidebarProps {
  conversations: AIConversationListItem[];
  activeId:      number | null;
  onSelect:      (id: number) => void;
  onNewChat:     () => void;
  onDelete:      (id: number) => void;
  onRename:      (id: number, title: string) => void;
}

export default function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
}: ChatSidebarProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const grouped = groupConversations(filtered);

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-full
                 bg-[#080c1c] border-r border-slate-800/60"
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 flex-shrink-0">

        {/* Top row: back + brand */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate("/hub")}
            className="flex items-center gap-1.5 text-slate-600
                       hover:text-slate-300 transition-colors text-xs font-semibold"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Hub
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center
                         text-[10px] font-black text-white"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
            >
              ✦
            </div>
            <span className="text-[11px] font-black text-slate-400 tracking-widest">
              GENERAL AI
            </span>
          </div>
        </div>

        {/* New chat */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5
                     rounded-xl text-sm font-semibold
                     bg-indigo-600 text-white hover:bg-indigo-500
                     transition-colors shadow-lg shadow-indigo-600/20"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          New Chat
        </button>

        {/* Search */}
        <div className="relative mt-3">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
            width="13" height="13" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl
                       pl-8 pr-3 py-2 text-xs text-slate-300 placeholder-slate-600
                       outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      {/* ── History ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span className="text-3xl">💬</span>
            <p className="text-xs text-slate-700 font-medium">No conversations yet.</p>
            <p className="text-xs text-slate-800">Start a new chat above!</p>
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-center text-xs text-slate-700 py-4 font-medium">
            No results for "{search}"
          </p>
        ) : (
          grouped.map(({ group, items }) => (
            <div key={group}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]
                            text-slate-700 px-3 mb-1.5 mt-1">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map((conv) => (
                  <ConvItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === activeId}
                    onSelect={() => onSelect(conv.id)}
                    onDelete={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                    onRename={(title) => onRename(conv.id, title)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
