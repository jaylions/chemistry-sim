from models.student_profile import StudentProfile, MisconceptionItem


def update_misconception_level(
    profile: StudentProfile,
    mc_id: str,
    new_level: int,
    effect: int,
) -> MisconceptionItem:
    """
    오개념 해소 레벨 업데이트.
    효과적인 발문에 따라 confidence도 낮아짐.
    """
    mc = profile.get_misconception(mc_id)
    if mc is None:
        raise ValueError(f"오개념 ID '{mc_id}' 를 찾을 수 없음")

    mc.resolution_level = new_level

    # 효과에 따라 확신도 감소
    if effect == 2:
        mc.confidence = max(0.0, mc.confidence - 0.3)
    elif effect == 1:
        mc.confidence = max(0.0, mc.confidence - 0.1)

    return mc


def get_active_misconceptions(profile: StudentProfile) -> list[MisconceptionItem]:
    """아직 해소되지 않은 오개념 목록 반환."""
    return [mc for mc in profile.misconceptions if mc.resolution_level < 4]
