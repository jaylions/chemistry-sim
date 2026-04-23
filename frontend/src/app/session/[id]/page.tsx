"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  StartSessionResponse,
  ChatResponse,
  ReportResponse,
  sendMessage,
  getReport,
  endSession,
} from "@/lib/api";
import ChatPanel, { Message } from "@/components/ChatPanel";
import StudentInfoPanel from "@/components/StudentInfoPanel";
import SessionReport from "@/components/SessionReport";
import { MisconceptionState } from "@/lib/api";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [sessionData, setSessionData] = useState<StartSessionResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mcStates, setMcStates] = useState<Record<string, MisconceptionState>>({});
  const [allResolved, setAllResolved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("session");
    if (!stored) {
      router.replace("/");
      return;
    }
    const data: StartSessionResponse = JSON.parse(stored);
    setSessionData(data);

    // 초기 omc 상태 세팅
    const initialStates: Record<string, MisconceptionState> = {};
    data.misconceptions.forEach((mc) => {
      initialStates[mc.id] = {
        description: mc.description,
        level: mc.resolution_level,
        resolved: mc.resolution_level === 4,
      };
    });
    setMcStates(initialStates);
  }, [router]);

  const handleSend = async (teacherMsg: string) => {
    if (!sessionData) return;

    setMessages((prev) => [...prev, { role: "teacher", content: teacherMsg }]);
    setIsLoading(true);

    try {
      const res: ChatResponse = await sendMessage(sessionId, teacherMsg);

      setMessages((prev) => {
        const updated = [...prev];
        // 마지막 teacher 메시지에 effectLevel 추가
        const lastTeacher = [...updated].reverse().find((m) => m.role === "teacher");
        if (lastTeacher) {
          lastTeacher.effectLevel = res.turn_analysis.effect_level;
          lastTeacher.dialogueAct = res.turn_analysis.dialogue_act;
        }
        return [
          ...updated,
          { role: "student", content: res.student_response },
        ];
      });

      setMcStates(res.misconception_states);
      setAllResolved(res.all_resolved);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "student", content: "[오류: 서버 응답을 받지 못했습니다]" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowReport = async () => {
    try {
      const r = await getReport(sessionId);
      setReport(r);
      setShowReport(true);
    } catch {
      alert("리포트를 불러올 수 없습니다.");
    }
  };

  const handleRestart = async () => {
    await endSession(sessionId);
    sessionStorage.removeItem("session");
    router.replace("/");
  };

  if (!sessionData) return null;

  if (showReport && report) {
    return (
      <div className="min-h-screen bg-slate-50 overflow-y-auto py-8">
        <SessionReport
          report={report}
          onBack={() => setShowReport(false)}
          onRestart={handleRestart}
        />
      </div>
    );
  }

  const { student, misconceptions } = sessionData;

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.replace("/")}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← 나가기
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">
            보일의 법칙 — {student.name} 학생
          </span>
        </div>
        <button
          onClick={handleShowReport}
          className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
        >
          분석 로그 보기
        </button>
      </header>

      {/* 3패널 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽: 학생 정보 */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-slate-50 overflow-hidden">
          <StudentInfoPanel
            studentName={student.name}
            grade={student.grade}
            worksheetDescription={student.worksheet_description}
            misconceptions={misconceptions}
            states={mcStates}
          />
        </aside>

        {/* 가운데: 대화 */}
        <main className="flex-1 min-h-0 bg-slate-50 overflow-hidden">
          <ChatPanel
            studentName={student.name}
            messages={messages}
            onSend={handleSend}
            isLoading={isLoading}
            allResolved={allResolved}
          />
        </main>

        {/* 오른쪽: 실시간 분석 */}
        <aside className="w-56 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">발문 효과 기록</h3>
          <div className="flex flex-col gap-2">
            {messages
              .filter((m) => m.role === "teacher" && m.effectLevel !== undefined)
              .slice(-8)
              .reverse()
              .map((m, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-2 border text-xs ${
                    m.effectLevel === 2
                      ? "bg-green-50 border-green-200"
                      : m.effectLevel === 1
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <p className="text-gray-700 line-clamp-2 mb-1">"{m.content}"</p>
                  <span
                    className={`font-semibold ${
                      m.effectLevel === 2
                        ? "text-green-600"
                        : m.effectLevel === 1
                        ? "text-yellow-600"
                        : "text-gray-400"
                    }`}
                  >
                    {m.effectLevel === 2
                      ? "효과적"
                      : m.effectLevel === 1
                      ? "부분 효과"
                      : "효과 없음"}
                  </span>
                </div>
              ))}
            {messages.filter((m) => m.role === "teacher").length === 0 && (
              <p className="text-xs text-gray-400">발문을 시작하면 여기에 표시됩니다.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
