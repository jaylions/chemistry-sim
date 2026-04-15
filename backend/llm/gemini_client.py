import os
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
_model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


def _get_model() -> genai.GenerativeModel:
    return genai.GenerativeModel(_model_name)


def generate_student_response(prompt: str) -> str:
    """학생 응답 텍스트 생성."""
    model = _get_model()
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.7,
            max_output_tokens=512,
        ),
    )
    return response.text.strip()


def judge_question_effect(prompt: str) -> dict:
    """발문 효과 판단 — JSON 응답 반환."""
    model = _get_model()
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.1,
            max_output_tokens=256,
        ),
    )
    text = response.text.strip()
    # JSON 블록 추출
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError(f"LLM judge 응답에서 JSON 파싱 실패: {text}")


def update_recap(old_recap: str, teacher_msg: str, student_msg: str) -> str:
    """Recap 누적 요약 갱신."""
    model = _get_model()
    prompt = f"""다음은 예비교사와 가상 학생의 대화 요약과 최신 교환입니다.
요약을 2~3문장으로 업데이트하세요. 한국어로만 답하세요.

기존 요약: {old_recap or '(없음)'}

최신 교환:
교사: {teacher_msg}
학생: {student_msg}

업데이트된 요약:"""
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.3,
            max_output_tokens=200,
        ),
    )
    return response.text.strip()
