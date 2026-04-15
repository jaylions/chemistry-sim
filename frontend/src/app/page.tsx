"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startSession } from "@/lib/api";

const SCENARIOS = [
  {
    key: "boyles_law",
    title: "보일의 법칙 — 이보",
    description: "입자 보존 / 입자 분포 / 입자 운동 오개념",
    detail: "주사기 실험 후 학습지에 오개념이 반영된 입자 모형을 그린 학생",
    badge: "보일의 법칙",
  },
];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSelect = async (key: string) => {
    setLoading(true);
    setError("");
    try {
      const session = await startSession(key);
      sessionStorage.setItem("session", JSON.stringify(session));
      router.push(`/session/${session.session_id}`);
    } catch {
      setError("백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">화학 오개념 학생 시뮬레이터</h1>
          <p className="text-gray-500 mt-2 text-sm">
            오개념을 가진 가상 학생과 대화하며 발문 기술을 연습하세요
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => handleSelect(s.key)}
              disabled={loading}
              className="bg-white rounded-2xl border border-gray-200 p-6 text-left hover:border-indigo-400 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full mb-2">
                    {s.badge}
                  </span>
                  <h2 className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                    {s.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                  <p className="text-xs text-gray-400 mt-2">{s.detail}</p>
                </div>
                <span className="text-gray-300 group-hover:text-indigo-400 text-2xl mt-1 transition-colors">
                  →
                </span>
              </div>
            </button>
          ))}

          <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-400 text-sm">
            샤를의 법칙 시나리오 준비 중...
          </div>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-500 bg-red-50 rounded-xl p-3">
            {error}
          </p>
        )}
        {loading && (
          <p className="mt-4 text-center text-sm text-indigo-500">세션 시작 중...</p>
        )}
      </div>
    </main>
  );
}
