import uuid
from dataclasses import dataclass, field
from .student_profile import StudentProfile


@dataclass
class SessionState:
    session_id: str
    student_profile: StudentProfile
    message_history: list[dict] = field(default_factory=list)
    recap: str = ""
    turn_count: int = 0
    effective_questions: list[dict] = field(default_factory=list)

    def add_teacher_message(self, content: str):
        self.message_history.append({"role": "teacher", "content": content})

    def add_student_message(self, content: str):
        self.message_history.append({"role": "student", "content": content})
        self.turn_count += 1

    def log_effective_question(self, question: str, effect_level: int, reason: str):
        if effect_level > 0:
            self.effective_questions.append({
                "turn": self.turn_count,
                "question": question,
                "effect_level": effect_level,
                "reason": reason,
            })

    def get_resolution_summary(self) -> dict:
        return {
            mc.id: {
                "description": mc.description,
                "level": mc.resolution_level,
                "resolved": mc.resolution_level == 4,
            }
            for mc in self.student_profile.misconceptions
        }


# In-memory store (Phase 1용; 추후 Redis로 교체 가능)
_sessions: dict[str, SessionState] = {}


def create_session(student_profile: StudentProfile) -> SessionState:
    session_id = str(uuid.uuid4())
    state = SessionState(session_id=session_id, student_profile=student_profile)
    _sessions[session_id] = state
    return state


def get_session(session_id: str) -> SessionState | None:
    return _sessions.get(session_id)


def delete_session(session_id: str):
    _sessions.pop(session_id, None)
