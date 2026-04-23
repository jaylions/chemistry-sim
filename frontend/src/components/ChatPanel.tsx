"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

export interface Message {
  role: "teacher" | "student";
  content: string;
  effectLevel?: number;
  dialogueAct?: string;
}

interface Props {
  studentName: string;
  messages: Message[];
  onSend: (message: string) => Promise<void>;
  isLoading: boolean;
  allResolved: boolean;
}

const EFFECT_BADGE: Record<number, { label: string; className: string }> = {
  0: { label: "효과 없음", className: "bg-gray-100 text-gray-500" },
  1: { label: "부분 효과", className: "bg-yellow-100 text-yellow-700" },
  2: { label: "효과적!", className: "bg-green-100 text-green-700" },
};

export default function ChatPanel({
  studentName,
  messages,
  onSend,
  isLoading,
  allResolved,
}: Props) {
  const [input, setInput] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || isLoading) return;
    setInput("");
    await onSend(msg);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 메시지 목록 */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm text-center">
              {studentName} 학생에게 발문을 시작해보세요.
              <br />
              <span className="text-xs">학습지를 참고하여 오개념을 파악하고 교정하세요.</span>
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isTeacher = msg.role === "teacher";
          return (
            <div
              key={i}
              className={`flex flex-col ${isTeacher ? "items-end" : "items-start"}`}
            >
              <span className="text-xs text-gray-400 mb-1 px-1">
                {isTeacher ? "교사 (나)" : studentName}
              </span>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  isTeacher
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                }`}
              >
                {msg.content}
              </div>
              {isTeacher && msg.effectLevel !== undefined && (
                <span
                  className={`text-xs mt-1 px-2 py-0.5 rounded-full font-medium ${
                    EFFECT_BADGE[msg.effectLevel].className
                  }`}
                >
                  {EFFECT_BADGE[msg.effectLevel].label}
                </span>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {allResolved && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 text-center">
            모든 오개념이 해소되었습니다!
          </div>
        )}

      </div>

      {/* 입력창 */}
      <div className="flex-shrink-0 border-t border-gray-100 p-4 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[44px] max-h-32"
            placeholder="발문을 입력하세요... (Enter로 전송, Shift+Enter 줄바꿈)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
