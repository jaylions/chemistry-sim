from models.student_profile import MisconceptionItem
from models.session_state import SessionState


def build_chat_prompt(
    session: SessionState,
    teacher_msg: str,
    dialogue_act_instruction: str,
    target_misconception: MisconceptionItem | None = None,
) -> str:
    profile = session.student_profile

    # Part 1: Role Frame
    part1 = f"""당신은 교사입니다. 아래 학생의 반응을 예측하세요.
이 학생은 특정 화학 오개념을 확신하며, 그 오개념으로부터 논리적으로 일관된 반응을 생성합니다.
오개념과 무관한 질문에는 정상적으로 답합니다.
반응은 반드시 {profile.name} 학생의 말투로, 1~3문장 이내로 작성하세요."""

    # Part 2: Persona
    misconception_ids = ", ".join(mc.id for mc in profile.misconceptions)
    part2 = f"""<student name='{profile.name}' grade='{profile.grade}' affect='{profile.affect}' misconceptions='{misconception_ids}'>
{profile.name}은 {profile.grade}로 {profile.affect}.
학습 스타일: {profile.learning_style}
실험 맥락: {profile.experiment_context}
학습지: {profile.worksheet_description}
</student>"""

    # Part 3: Epistemic State
    master_str = "\n".join(f"- master({kc})" for kc in profile.master_kcs)
    unknown_str = "\n".join(f"- unknown({kc}) — 잘 모름, 무작위 반응" for kc in profile.unknown_kcs) if profile.unknown_kcs else ""
    misconception_str = "\n\n".join(mc.to_prompt_str() for mc in profile.misconceptions)

    part3 = f"""[학생이 아는 것]
{master_str}

[학생이 혼동하는 것 — 오개념]
{misconception_str}"""

    if unknown_str:
        part3 += f"\n\n[학생이 모르는 것]\n{unknown_str}"

    # Part 4: Recap + 반응 지시
    recap_block = f"<recap>{session.recap}</recap>" if session.recap else "<recap>(첫 번째 대화)</recap>"
    if target_misconception:
        target_block = f"""[이번 턴의 주요 오개념]
id: {target_misconception.id}
오개념: {target_misconception.schema_student}
올바른 개념: {target_misconception.schema_correct}
현재 해소 레벨: {target_misconception.resolution_level}/4

현재 반응 지시는 이 오개념에 대한 학생의 반응 상태를 우선 적용하세요.
다른 오개념은 교사 발문이 직접 관련될 때만 함께 반영하세요."""
    else:
        target_block = """[이번 턴의 주요 오개념]
교사 발문이 특정 오개념과 직접 연결되지 않았습니다.
오개념과 무관한 질문이면 학생이 아는 범위 안에서 자연스럽게 답하세요."""

    part4 = f"""{recap_block}

{target_block}

[현재 반응 지시]
{dialogue_act_instruction}"""

    # Message Log
    history_lines = []
    for msg in session.message_history[-6:]:  # 최근 6턴만 유지
        role_label = "교사" if msg["role"] == "teacher" else profile.name
        history_lines.append(f"{role_label}: {msg['content']}")

    history_str = "\n".join(history_lines)

    prompt = f"""{part1}

{part2}

{part3}

{part4}

[대화 기록]
{history_str}
교사: {teacher_msg}
{profile.name}:"""

    return prompt
