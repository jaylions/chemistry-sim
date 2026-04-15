from models.student_profile import MisconceptionItem


# (resolution_level, effect) → dialogue act
_ACT_MAP = {
    (0, 0): "confident_wrong",     # 오개념 확신
    (0, 1): "confident_wrong",
    (0, 2): "resistant",           # 처음엔 저항
    (1, 0): "repeat_wrong",        # 오답 반복
    (1, 1): "weak_doubt",          # 약한 의심
    (1, 2): "resistant",
    (2, 0): "weak_doubt",
    (2, 1): "confused",            # 혼란
    (2, 2): "confused",
    (3, 0): "confused",
    (3, 1): "partial_understanding",
    (3, 2): "resolved",            # 해소
    (4, 0): "correct",             # 정상 답변
    (4, 1): "correct",
    (4, 2): "correct",
}

_ACT_INSTRUCTIONS = {
    "confident_wrong": (
        "학생은 자신의 오개념이 맞다고 확신하며 자신 있게 답한다. "
        "틀렸다는 기색 없이 자기 생각을 설명한다."
    ),
    "resistant": (
        "교사의 발문에 약간 당황하지만 여전히 자기 생각이 맞다고 주장한다. "
        "'그래도 제 생각엔...' 식으로 저항한다."
    ),
    "repeat_wrong": (
        "이전과 같은 오답을 다시 반복한다. 질문을 잘 못 이해한 것처럼 반응한다."
    ),
    "weak_doubt": (
        "자기 답에 약간 의심이 생겼다. '...맞나요?' '제가 알기론...' 식으로 표현한다."
    ),
    "confused": (
        "혼란스럽다. '잘 모르겠어요', '헷갈려요' 식으로 표현하며 다시 생각해본다."
    ),
    "partial_understanding": (
        "부분적으로 이해했다. 올바른 개념의 일부를 말하지만 완전히 정리되지 않은 상태다."
    ),
    "resolved": (
        "오개념이 해소됐다. '아, 그렇구나!' 식으로 깨달음을 표현하고 올바른 개념을 말한다."
    ),
    "correct": (
        "이미 해소된 개념이므로 정상적으로 올바르게 답한다."
    ),
}


def determine_dialogue_act(
    resolution_level: int,
    effect: int,
) -> tuple[str, str]:
    """
    Returns:
        (act_key, instruction_str)
    """
    key = (min(resolution_level, 4), min(effect, 2))
    act = _ACT_MAP.get(key, "confident_wrong")
    instruction = _ACT_INSTRUCTIONS[act]
    return act, instruction
