"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionItem } from "@/app/api/sessions/route";

type Props = {
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  isOpen: boolean;
  onClose: () => void;
};

function groupByDate(sessions: SessionItem[]): { label: string; items: SessionItem[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, SessionItem[]> = {
    今日: [],
    昨日: [],
    先週: [],
    それ以前: [],
  };

  for (const s of sessions) {
    const d = new Date(s.created_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups["今日"].push(s);
    else if (day >= yesterday) groups["昨日"].push(s);
    else if (day >= lastWeek) groups["先週"].push(s);
    else groups["それ以前"].push(s);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export default function ChatSidebar({
  currentSessionId,
  onNewChat,
  onSelectSession,
  isOpen,
  onClose,
}: Props) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSessions();
  }, [fetchSessions, currentSessionId]);

  async function handleDelete(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation();
    setDeletingId(sessionId);
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) onNewChat();
    } finally {
      setDeletingId(null);
    }
  }

  const groups = groupByDate(sessions);

  const inner = (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-100">
      {/* ヘッダー */}
      <div className="p-3 flex-shrink-0">
        <button
          onClick={() => { onNewChat(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新しいチャット
        </button>
      </div>

      {/* セッションリスト */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {groups.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">履歴がありません</p>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label} className="mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">{label}</p>
              {items.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { onSelectSession(s.id); onClose(); }}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left group transition ${
                    s.id === currentSessionId
                      ? "bg-sky-100 text-sky-700"
                      : "hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0 opacity-50">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  <span className="flex-1 text-xs truncate">
                    {s.title.length > 20 ? s.title.slice(0, 20) + "…" : s.title}
                  </span>
                  <span
                    role="button"
                    onClick={(e) => handleDelete(e, s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-300 transition shrink-0"
                    aria-label="削除"
                  >
                    {deletingId === s.id ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5 text-gray-400 hover:text-red-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* PC: 固定サイドバー */}
      <aside className="hidden md:flex flex-col w-[260px] flex-shrink-0">
        {inner}
      </aside>

      {/* スマホ: オーバーレイ */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={onClose}
          />
          <aside className="fixed left-0 top-24 bottom-0 w-[260px] z-30 md:hidden flex flex-col">
            {inner}
          </aside>
        </>
      )}
    </>
  );
}
