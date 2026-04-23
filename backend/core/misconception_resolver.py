from models.student_profile import MisconceptionItem
from llm.gemini_client import classify_target_misconception, judge_question_effect


def select_target_misconception(
    teacher_msg: str,
    active_misconceptions: list[MisconceptionItem],
) -> dict:
    """
    교사 발문이 직접 겨냥한 오개념을 active 목록 중에서 선택.

    Returns:
        {"target_id": str | None, "reason": str}
    """
    if not active_misconceptions:
        return {"target_id": None, "reason": "해소된 오개념만 있음"}

    mc_options = "\n".join(
        (
            f"- {mc.id}\n"
            f"  개념: {mc.kc_a} / {mc.kc_b}\n"
            f"  오개념 설명: {mc.description}\n"
            f"  학생 스키마: {mc.schema_student}\n"
            f"  올바른 스키마: {mc.schema_correct}"
        )
        for mc in active_misconceptions
    )

    prompt = f"""당신은 화학 교육 대화 분석가입니다.
교사의 발문이 아래 학생 오개념 중 무엇과 직접적으로 관련되는지 판단하세요.

[활성 오개념 목록]
{mc_options}

[교사 발문]
"{teacher_msg}"

판단 기준:
- 발문이 특정 오개념의 핵심 개념, 학생 스키마, 또는 올바른 스키마를 직접 건드리면 해당 id를 고르세요.
- 여러 오개념과 관련될 수 있어도 가장 직접적인 하나만 고르세요.
- 단순 격려, 수업 진행, 오개념과 무관한 질문이면 target_id를 null로 두세요.
- confidence 값이나 해소 레벨을 기준으로 고르지 말고, 발문 내용과의 직접 관련성만 보세요.

반드시 JSON만 반환하세요 (다른 텍스트, 마크다운 없이). target_id는 오개념 id 또는 null이고, reason은 15자 이내:
{{"target_id": "B1", "reason": "15자 이내"}}"""

    result = classify_target_misconception(prompt)
    raw_target_id = result.get("target_id")
    target_id = raw_target_id.strip() if isinstance(raw_target_id, str) else None
    if target_id and target_id.lower() in {"null", "none", "없음"}:
        target_id = None

    active_ids = {mc.id for mc in active_misconceptions}
    if target_id not in active_ids:
        target_id = None

    return {
        "target_id": target_id,
        "reason": result.get("reason", "직접 관련 없음"),
    }


def evaluate_teacher_question(
    teacher_msg: str,
    misconception: MisconceptionItem,
    current_level: int,
) -> dict:
    """
    교사 발문이 해당 오개념에 얼마나 효과적인지 판단.

    Returns:
        {"effect": 0|1|2, "reason": str, "new_level": int}
    """
    prompt = f"""당신은 화학 교육 전문가입니다. 교사의 발문이 학생의 오개념을 해소하는 데 얼마나 효과적인지 판단하세요.

학생의 오개념: {misconception.description}
학생의 오개념 스키마: {misconception.schema_student}
올바른 스키마: {misconception.schema_correct}
현재 해소 레벨: {current_level} / 4
탐구 맥락: {misconception.kc_b} (보일의 법칙 주사기 실험)

교사의 발문: "{teacher_msg}"

판단 기준:
- 0 (효과 없음): 오개념과 무관하거나, 단순 반복 설명, 직접 정답 제시
- 1 (부분적): 오개념과 관련되지만 핵심 모순을 직접 건드리지 않음
- 2 (효과적): 반례 제시, 인지 갈등 유발, 핵심 모순을 직접 타격

반드시 JSON만 반환하세요 (다른 텍스트, 마크다운 없이). reason은 15자 이내:
{{"effect": 0, "reason": "15자 이내"}}"""

    result = judge_question_effect(prompt)
    effect = int(result.get("effect", 0))
    result["effect"] = effect
    result["new_level"] = min(4, current_level + effect)
    return result
