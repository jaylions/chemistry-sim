"use client";

import { ReportResponse } from "@/lib/api";

interface Props {
  report: ReportResponse;
  onBack: () => void;
  onRestart: () => void;
}

const EFFECT_LABELS: Record<number, { label: string; className: string }> = {
  0: { label: "효과 없음", className: "bg-gray-100 text-gray-600 border-gray-200" },
  1: { label: "부분 효과", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  2: { label: "효과적", className: "bg-green-50 text-green-700 border-green-200" },
};

const DIALOGUE_ACT_LABELS: Record<string, string> = {
  confident_wrong: "오개념 확신",
  resistant: "저항",
  repeat_wrong: "오답 반복",
  weak_doubt: "약한 의심",
  confused: "혼란",
  partial_understanding: "부분 이해",
  resolved: "해소",
  correct: "정상 답변",
};

export default function SessionReport({ report, onBack, onRestart }: Props) {
  const effectiveLevelTwo = report.effective_questions.filter(
    (q) => q.effect_level === 2
  );

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 대화로
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">세션 분석 리포트</h2>
          <p className="text-gray-500 text-sm mt-1">총 {report.total_turns}턴</p>
        </div>
        <button
          onClick={onRestart}
          className="text-sm bg-indigo-600 text-white rounded-lg px-3 py-2 font-medium hover:bg-indigo-700 transition-colors"
        >
          다시 연습
        </button>
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

      {/* 시스템 판단 로그 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">시스템 판단 로그</h3>
          <span className="text-xs text-gray-400">{report.judgment_logs.length}개 턴</span>
        </div>

        {report.judgment_logs.length === 0 ? (
          <p className="text-sm text-gray-400">아직 분석할 대화가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {report.judgment_logs.map((log) => {
              const effect = EFFECT_LABELS[log.effect_level] ?? EFFECT_LABELS[0];
              const actLabel = DIALOGUE_ACT_LABELS[log.dialogue_act] ?? log.dialogue_act;
              const levelChange =
                log.previous_level === null || log.new_level === null
                  ? "변화 없음"
                  : `L${log.previous_level} → L${log.new_level}`;

              return (
                <div key={log.turn} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-gray-500">턴 {log.turn}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${effect.className}`}>
                      {effect.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
                      {actLabel}
                    </span>
                    <span className="text-xs text-gray-400">{levelChange}</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">교사 발문</p>
                      <p className="text-sm text-gray-800 leading-relaxed">"{log.teacher_message}"</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">학생 응답</p>
                      <p className="text-sm text-gray-800 leading-relaxed">"{log.student_response}"</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-500 mb-1">타깃 오개념</p>
                      <p className="text-gray-700">
                        {log.target_misconception
                          ? `${log.target_misconception} · ${log.target_description}`
                          : "직접 관련 없음"}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-500 mb-1">타깃 선정 근거</p>
                      <p className="text-gray-700">{log.target_selection_reason}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-500 mb-1">효과 판정 근거</p>
                      <p className="text-gray-700">{log.reason}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
