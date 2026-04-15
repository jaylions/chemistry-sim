"use client";

import { MisconceptionState } from "@/lib/api";

const LEVEL_LABELS = ["오개념 확신", "약한 의심", "혼란", "부분 이해", "해소 완료"];

const LEVEL_COLORS = [
  "bg-red-500",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-blue-400",
  "bg-green-500",
];

interface Props {
  studentName: string;
  grade: string;
  worksheetDescription: string;
  misconceptions: Array<{
    id: string;
    kc_a: string;
    description: string;
  }>;
  states: Record<string, MisconceptionState>;
}

export default function StudentInfoPanel({
  studentName,
  grade,
  worksheetDescription,
  misconceptions,
  states,
}: Props) {
  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto p-4">
      {/* 학생 기본 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
            {studentName[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{studentName}</p>
            <p className="text-xs text-gray-500">{grade}</p>
          </div>
        </div>
      </div>

      {/* 오개념 해소 상태 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">오개념 해소 현황</h3>
        <div className="flex flex-col gap-3">
          {misconceptions.map((mc) => {
            const state = states[mc.id];
            const level = state?.level ?? 0;
            const colorClass = LEVEL_COLORS[level];
            const pct = (level / 4) * 100;

            return (
              <div key={mc.id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600 font-medium">{mc.kc_a}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${colorClass}`}
                  >
                    L{level}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{LEVEL_LABELS[level]}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 학습지 설명 */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">학습지 내용</h3>
        <p className="text-xs text-amber-700 leading-relaxed">{worksheetDescription}</p>
      </div>
    </div>
  );
}
