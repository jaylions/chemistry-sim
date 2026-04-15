from models.student_profile import MisconceptionItem
from llm.gemini_client import judge_question_effect


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

반드시 JSON만 반환하세요 (다른 텍스트 없이):
{{"effect": 0, "reason": "한 문장 이유"}}"""

    result = judge_question_effect(prompt)
    effect = int(result.get("effect", 0))
    result["effect"] = effect
    result["new_level"] = min(4, current_level + effect)
    return result
