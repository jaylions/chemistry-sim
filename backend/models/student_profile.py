from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MisconceptionItem:
    id: str                        # "B1"
    kc_a: str                      # "입자의 보존"
    kc_b: str                      # "압력 증가"
    description: str               # 오개념 설명
    confidence: float              # 틀린 답 확신도 (0.0 ~ 1.0)
    resolution_level: int          # 해소 단계 (0 ~ 4)
    schema_correct: str            # 과학적으로 올바른 스키마
    schema_student: str            # 학생이 가진 오개념 스키마
    example_qa: list[dict]         # KC별 예시 Q&A

    def to_prompt_str(self) -> str:
        level_desc = {
            0: "오개념으로 자신 있게 답변",
            1: "약한 의심 표현",
            2: "혼란 상태",
            3: "부분 이해",
            4: "해소 완료",
        }
        examples = "\n".join(
            f"  Q: {qa['question']}\n  학생 답: {qa['student_answer']}\n  정답: {qa['correct_answer']}"
            for qa in self.example_qa
        )
        return (
            f"confusion({self.kc_a}, {self.kc_b}):\n"
            f"  오개념: {self.schema_student}\n"
            f"  올바른 개념: {self.schema_correct}\n"
            f"  확신도: {self.confidence}\n"
            f"  [해소 레벨: {self.resolution_level}/4 — {level_desc[self.resolution_level]}]\n"
            f"  예시:\n{examples}"
        )


@dataclass
class StudentProfile:
    name: str
    grade: str
    affect: str
    learning_style: str
    worksheet_description: str     # 학생이 그린 학습지 설명
    experiment_context: str
    master_kcs: list[str]          # 정상적으로 아는 개념
    unknown_kcs: list[str]         # 모르는 개념
    misconceptions: list[MisconceptionItem]

    def get_misconception(self, mc_id: str) -> Optional[MisconceptionItem]:
        for mc in self.misconceptions:
            if mc.id == mc_id:
                return mc
        return None

    def all_resolved(self) -> bool:
        return all(mc.resolution_level == 4 for mc in self.misconceptions)
