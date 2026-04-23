import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models.student_profile import StudentProfile, MisconceptionItem
from models.session_state import create_session, get_session, delete_session
from core.misconception_resolver import evaluate_teacher_question, select_target_misconception
from core.schema_modifier import update_misconception_level, get_active_misconceptions
from core.dialogue_act import determine_dialogue_act
from core.prompt_builder import build_chat_prompt
from llm.gemini_client import generate_student_response, update_recap

app = FastAPI(title="화학 오개념 학생 시뮬레이터")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data" / "misconceptions"

# 시나리오 레지스트리 — 파일명 기반으로 자동 로드
_SCENARIOS = {
    "boyles_law": DATA_DIR / "boyles_law.json",
}


def _load_profile(scenario_key: str) -> StudentProfile:
    path = _SCENARIOS.get(scenario_key)
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail=f"시나리오 '{scenario_key}' 를 찾을 수 없음")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)["student"]

    misconceptions = [
        MisconceptionItem(
            id=mc["id"],
            kc_a=mc["kc_a"],
            kc_b=mc["kc_b"],
            description=mc["description"],
            confidence=mc["confidence"],
            resolution_level=mc["resolution_level"],
            schema_correct=mc["schema_correct"],
            schema_student=mc["schema_student"],
            example_qa=mc["example_qa"],
        )
        for mc in data["misconceptions"]
    ]

    return StudentProfile(
        name=data["name"],
        grade=data["grade"],
        affect=data["affect"],
        learning_style=data["learning_style"],
        worksheet_description=data["worksheet_description"],
        experiment_context=data["experiment_context"],
        master_kcs=data["master_kcs"],
        unknown_kcs=data.get("unknown_kcs", []),
        misconceptions=misconceptions,
    )


# ── Request / Response 스키마 ──

class StartSessionRequest(BaseModel):
    scenario: str = "boyles_law"


class ChatRequest(BaseModel):
    teacher_message: str


class ChatResponse(BaseModel):
    student_response: str
    turn_analysis: dict
    misconception_states: dict
    all_resolved: bool


# ── 엔드포인트 ──

@app.get("/scenarios")
def list_scenarios():
    return {"scenarios": list(_SCENARIOS.keys())}


@app.post("/session/start")
def start_session(req: StartSessionRequest):
    profile = _load_profile(req.scenario)
    session = create_session(profile)
    return {
        "session_id": session.session_id,
        "student": {
            "name": profile.name,
            "grade": profile.grade,
            "affect": profile.affect,
            "worksheet_description": profile.worksheet_description,
            "experiment_context": profile.experiment_context,
        },
        "misconceptions": [
            {
                "id": mc.id,
                "kc_a": mc.kc_a,
                "kc_b": mc.kc_b,
                "description": mc.description,
                "resolution_level": mc.resolution_level,
            }
            for mc in profile.misconceptions
        ],
    }


@app.post("/session/{session_id}/chat", response_model=ChatResponse)
def chat(session_id: str, req: ChatRequest):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없음")

    teacher_msg = req.teacher_message.strip()
    if not teacher_msg:
        raise HTTPException(status_code=400, detail="빈 메시지")

    profile = session.student_profile
    active_mcs = get_active_misconceptions(profile)

    # 교사 발문이 직접 겨냥한 오개념 하나에 대해 효과 판단
    target_selection = select_target_misconception(teacher_msg, active_mcs)
    target_mc = (
        profile.get_misconception(target_selection["target_id"])
        if target_selection["target_id"]
        else None
    )

    effect = 0
    reason = target_selection["reason"]
    previous_level = None
    new_level = None
    updated_mc_id = None

    if target_mc:
        previous_level = target_mc.resolution_level
        eval_result = evaluate_teacher_question(teacher_msg, target_mc, target_mc.resolution_level)
        effect = eval_result["effect"]
        reason = eval_result["reason"]
        new_level = eval_result["new_level"]
        updated_mc_id = target_mc.id

        update_misconception_level(profile, target_mc.id, new_level, effect)

    # Dialogue Act 결정
    current_level = new_level if new_level is not None else 4
    act_key, act_instruction = determine_dialogue_act(current_level, effect)

    # 프롬프트 조립 → 학생 응답 생성
    prompt = build_chat_prompt(session, teacher_msg, act_instruction, target_mc)
    student_response = generate_student_response(prompt)

    # 세션 상태 갱신
    session.add_teacher_message(teacher_msg)
    session.add_student_message(student_response)
    session.log_effective_question(teacher_msg, effect, reason)
    turn_analysis = {
        "effect_level": effect,
        "reason": reason,
        "dialogue_act": act_key,
        "updated_misconception": updated_mc_id,
        "target_selection_reason": target_selection["reason"],
        "target_misconception": target_mc.id if target_mc else None,
        "target_description": target_mc.description if target_mc else None,
        "previous_level": previous_level,
        "new_level": new_level,
    }
    session.log_judgment({
        **turn_analysis,
        "teacher_message": teacher_msg,
        "student_response": student_response,
    })

    # Recap 업데이트 (비동기적으로 처리해도 되지만 우선 동기)
    session.recap = update_recap(session.recap, teacher_msg, student_response)

    return ChatResponse(
        student_response=student_response,
        turn_analysis=turn_analysis,
        misconception_states=session.get_resolution_summary(),
        all_resolved=profile.all_resolved(),
    )


@app.get("/session/{session_id}/report")
def get_report(session_id: str):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없음")

    mc_states = session.get_resolution_summary()
    resolved = [k for k, v in mc_states.items() if v["resolved"]]
    unresolved = [k for k, v in mc_states.items() if not v["resolved"]]

    return {
        "total_turns": session.turn_count,
        "resolved_count": len(resolved),
        "unresolved_count": len(unresolved),
        "resolved_misconceptions": resolved,
        "unresolved_misconceptions": unresolved,
        "effective_questions": session.effective_questions,
        "judgment_logs": session.judgment_logs,
        "misconception_states": mc_states,
    }


@app.delete("/session/{session_id}")
def end_session(session_id: str):
    delete_session(session_id)
    return {"message": "세션 종료"}
