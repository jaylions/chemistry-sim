import os
import json
import re
import time
import logging
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
_model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

_MAX_RETRIES = 4
_BASE_DELAY = 12  # 초 (429 응답의 retry_delay보다 약간 크게)


def _get_model() -> genai.GenerativeModel:
    return genai.GenerativeModel(_model_name)


def _generate_with_retry(model, prompt, generation_config):
    """429 ResourceExhausted 발생 시 지수 백오프로 재시도."""
    delay = _BASE_DELAY
    for attempt in range(_MAX_RETRIES):
        try:
            return model.generate_content(prompt, generation_config=generation_config)
        except ResourceExhausted as e:
            if attempt == _MAX_RETRIES - 1:
                raise
            logger.warning(f"Gemini 쿼터 초과 (시도 {attempt + 1}/{_MAX_RETRIES}), {delay}초 후 재시도...")
            time.sleep(delay)
            delay = min(delay * 2, 60)


def generate_student_response(prompt: str) -> str:
    """학생 응답 텍스트 생성."""
    model = _get_model()
    response = _generate_with_retry(
        model,
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.7,
            max_output_tokens=8192,
        ),
    )
    candidate = response.candidates[0]
    finish_reason = candidate.finish_reason
    full_text = "".join(
        part.text for part in candidate.content.parts if hasattr(part, "text")
    ).strip()
    print(f"[student_response] finish_reason={finish_reason} text={repr(full_text)}", flush=True)
    # 프롬프트가 "이름:" 형식으로 끝나므로 모델이 이름을 에코할 수 있음 — 제거
    if ":" in full_text:
        first_colon = full_text.index(":")
        # 콜론 앞이 짧으면(이름) prefix 제거
        if first_colon < 15:
            full_text = full_text[first_colon + 1:].strip()
    return full_text


def judge_question_effect(prompt: str) -> dict:
    """발문 효과 판단 — JSON 응답 반환."""
    model = _get_model()
    response = _generate_with_retry(
        model,
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.1,
            max_output_tokens=1024,
        ),
    )
    text = response.text.strip()
    # 코드블록 제거 후 JSON 추출
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
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
    response = _generate_with_retry(
        model,
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.3,
            max_output_tokens=200,
        ),
    )
    return response.text.strip()
