"use client";

import { ReportResponse } from "@/lib/api";

interface Props {
  report: ReportResponse;
  onRestart: () => void;
}

export default function SessionReport({ report, onRestart }: Props) {
  const effectiveLevelTwo = report.effective_questions.filter(
    (q) => q.effect_level === 2
  );

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">세션 분석 리포트</h2>
        <p className="text-gray-500 text-sm mt-1">총 {report.total_turns}턴</p>
      </div>

      {/* 해소 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{report.resolved_count}</p>
          <p className="text-sm text-green-700 mt-1">해소된 오개념</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{report.unresolved_count}</p>
          <p className="text-sm text-red-600 mt-1">미해소 오개념</p>
        </div>
      </div>

      {/* 오개념 상태 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-700 mb-3">오개념별 결과</h3>
        <div className="flex flex-col gap-2">
          {Object.entries(report.misconception_states).map(([id, state]) => (
            <div key={id} className="flex items-center gap-3">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  state.resolved ? "bg-green-500" : "bg-red-400"
                }`}
              >
                {state.resolved ? "✓" : "✗"}
              </span>
              <span className="text-sm text-gray-700 flex-1">{state.description}</span>
              <span className="text-xs text-gray-400">L{state.level}/4</span>
            </div>
          ))}
        </div>
      </div>

      {/* 효과적인 발문 */}
      {effectiveLevelTwo.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-700 mb-3">
            핵심 발문 ({effectiveLevelTwo.length}개)
          </h3>
          <div className="flex flex-col gap-3">
            {effectiveLevelTwo.map((q, i) => (
              <div key={i} className="border-l-4 border-indigo-400 pl-3">
                <p className="text-sm text-gray-800 font-medium">"{q.question}"</p>
                <p className="text-xs text-gray-500 mt-0.5">{q.reason}</p>
                <span className="text-xs text-indigo-500">턴 {q.turn}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onRestart}
        className="w-full bg-indigo-600 text-white rounded-xl py-3 font-medium hover:bg-indigo-700 transition-colors"
      >
        다시 연습하기
      </button>
    </div>
  );
}
