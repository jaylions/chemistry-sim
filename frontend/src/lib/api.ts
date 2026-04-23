const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface MisconceptionState {
  description: string;
  level: number;
  resolved: boolean;
}

export interface StartSessionResponse {
  session_id: string;
  student: {
    name: string;
    grade: string;
    affect: string;
    worksheet_description: string;
    experiment_context: string;
  };
  misconceptions: Array<{
    id: string;
    kc_a: string;
    kc_b: string;
    description: string;
    resolution_level: number;
  }>;
}

export interface ChatResponse {
  student_response: string;
  turn_analysis: {
    effect_level: number;
    reason: string;
    dialogue_act: string;
    updated_misconception: string | null;
    target_selection_reason?: string;
    target_misconception?: string | null;
    target_description?: string | null;
    previous_level?: number | null;
    new_level?: number | null;
  };
  misconception_states: Record<string, MisconceptionState>;
  all_resolved: boolean;
}

export interface JudgmentLog {
  turn: number;
  teacher_message: string;
  student_response: string;
  effect_level: number;
  reason: string;
  dialogue_act: string;
  updated_misconception: string | null;
  target_selection_reason: string;
  target_misconception: string | null;
  target_description: string | null;
  previous_level: number | null;
  new_level: number | null;
}

export interface ReportResponse {
  total_turns: number;
  resolved_count: number;
  unresolved_count: number;
  resolved_misconceptions: string[];
  unresolved_misconceptions: string[];
  effective_questions: Array<{
    turn: number;
    question: string;
    effect_level: number;
    reason: string;
  }>;
  judgment_logs: JudgmentLog[];
  misconception_states: Record<string, MisconceptionState>;
}

export async function startSession(scenario = "boyles_law"): Promise<StartSessionResponse> {
  const res = await fetch(`${BASE_URL}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sendMessage(
  sessionId: string,
  teacherMessage: string
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/session/${sessionId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teacher_message: teacherMessage }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getReport(sessionId: string): Promise<ReportResponse> {
  const res = await fetch(`${BASE_URL}/session/${sessionId}/report`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function endSession(sessionId: string): Promise<void> {
  await fetch(`${BASE_URL}/session/${sessionId}`, { method: "DELETE" });
}
