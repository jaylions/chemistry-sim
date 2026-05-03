# Chemistry Sim

화학 오개념 학생 시뮬레이터 프로젝트입니다.  
예비교사 또는 교사가 가상의 학생과 대화하면서, 학생이 가진 오개념을 발문으로 탐색하고 교정하는 과정을 연습할 수 있도록 만든 웹 애플리케이션입니다.

현재 구현된 시나리오는 `보일의 법칙` 1종이며, 백엔드는 FastAPI, 프런트엔드는 Next.js(App Router)로 구성되어 있습니다. 학생 응답 생성과 발문 판정 일부는 Gemini API를 사용합니다.

## 1. 프로젝트 목적

이 프로젝트는 단순 챗봇이 아니라, 아래 과정을 연습하는 시뮬레이터에 가깝습니다.

- 학생의 오개념을 학습지와 대화를 통해 추정하기
- 교사의 발문이 실제로 어떤 오개념을 겨냥했는지 분석하기
- 발문의 효과를 `효과 없음 / 부분 효과 / 효과적`으로 판정하기
- 오개념 해소 정도를 턴마다 추적하기
- 학생의 반응을 현재 오개념 상태에 맞게 일관되게 생성하기

즉, 핵심은 "학생 응답 생성" 자체보다, `오개념 상태를 기반으로 한 대화 시뮬레이션`입니다.

## 2. 기술 스택

- Backend: FastAPI, Pydantic, python-dotenv
- LLM: Google Gemini (`google-generativeai`)
- Frontend: Next.js 16, React 19, TypeScript
- Styling: Tailwind CSS 4
- State/Persistence:
  - 서버 세션: 메모리(in-memory)
  - 클라이언트 세션 메타데이터: `sessionStorage`

## 3. 디렉터리 구조

```text
chemistry-sim/
├─ .env.example
├─ README.md
├─ backend/
│  ├─ main.py
│  ├─ requirements.txt
│  ├─ core/
│  │  ├─ dialogue_act.py
│  │  ├─ misconception_resolver.py
│  │  ├─ prompt_builder.py
│  │  └─ schema_modifier.py
│  ├─ data/
│  │  └─ misconceptions/
│  │     └─ boyles_law.json
│  ├─ llm/
│  │  └─ gemini_client.py
│  └─ models/
│     ├─ session_state.py
│     └─ student_profile.py
└─ frontend/
   ├─ package.json
   ├─ next.config.ts
   └─ src/
      ├─ app/
      │  ├─ layout.tsx
      │  ├─ page.tsx
      │  └─ session/[id]/page.tsx
      ├─ components/
      │  ├─ ChatPanel.tsx
      │  ├─ SessionReport.tsx
      │  └─ StudentInfoPanel.tsx
      └─ lib/
         └─ api.ts
```

## 4. 백엔드 구조

### `backend/main.py`

백엔드의 진입점입니다. 주요 역할은 다음과 같습니다.

- 시나리오 목록 관리
- 시나리오 JSON을 `StudentProfile` 객체로 로드
- 세션 시작/대화/리포트/종료 API 제공
- 각 턴마다 오개념 선택, 발문 효과 판정, 상태 갱신, 학생 응답 생성을 연결

### `backend/models`

#### `student_profile.py`

학생 상태를 표현하는 핵심 데이터 모델입니다.

- `MisconceptionItem`
  - 오개념 ID
  - 연결된 개념 축(`kc_a`, `kc_b`)
  - 오개념 설명
  - 확신도(`confidence`)
  - 해소 레벨(`resolution_level`, 0~4)
  - 학생 스키마 / 올바른 스키마
  - 예시 질의응답
- `StudentProfile`
  - 학생 이름, 학년, 정서
  - 학습 스타일
  - 실험 맥락
  - 이미 아는 개념
  - 모르는 개념
  - 오개념 목록

#### `session_state.py`

대화 세션 단위 상태를 보관합니다.

- `message_history`: 교사/학생 대화 로그
- `recap`: 최근 대화를 요약한 누적 요약
- `turn_count`: 학생 응답 기준 턴 수
- `effective_questions`: 효과가 있었던 발문 기록
- `judgment_logs`: 시스템의 턴별 분석 결과

현재 세션 저장소는 전역 딕셔너리 `_sessions` 기반 메모리 저장소입니다.  
즉, 서버 재시작 시 세션이 모두 사라지고, 멀티 인스턴스 환경도 고려되어 있지 않습니다.

### `backend/core`

#### `misconception_resolver.py`

교사 발문을 분석합니다.

- `select_target_misconception(...)`
  - 현재 활성 오개념 목록 중에서
  - 이번 교사 질문이 직접 겨냥한 오개념 하나를 LLM으로 선택
- `evaluate_teacher_question(...)`
  - 선택된 오개념에 대해 질문의 효과를 LLM으로 판정
  - 효과 값 `0 | 1 | 2`
  - 결과에 따라 새 해소 레벨 계산

#### `schema_modifier.py`

오개념 상태를 실제로 갱신합니다.

- `update_misconception_level(...)`
  - `resolution_level` 갱신
  - 효과가 있으면 `confidence` 감소
- `get_active_misconceptions(...)`
  - 아직 완전히 해소되지 않은 오개념만 필터링

#### `dialogue_act.py`

오개념 해소 단계와 이번 턴 효과를 바탕으로 학생의 반응 태도를 정합니다.

예:

- `confident_wrong`: 자신 있게 틀린 답
- `resistant`: 약간 흔들리지만 자기 생각 고수
- `weak_doubt`: 자기 답에 의심 생김
- `confused`: 혼란 상태
- `partial_understanding`: 부분 이해
- `resolved`: 깨달음 표현
- `correct`: 이미 해소된 정상 답변

#### `prompt_builder.py`

학생 응답 생성용 프롬프트를 조립합니다. 프롬프트는 다음 요소로 구성됩니다.

- 학생 역할 프레임
- 학생 페르소나
- 학생이 아는 개념 / 오개념 / 모르는 개념
- 현재 타깃 오개념 정보
- 최근 대화 요약(`recap`)
- 최근 대화 히스토리(최근 6개 메시지)
- 이번 턴 반응 지시(`dialogue act`)

### `backend/llm/gemini_client.py`

Gemini 호출을 담당합니다.

- 학생 응답 생성
- 발문 효과 판정
- 타깃 오개념 분류
- recap 요약 업데이트

특징:

- `ResourceExhausted(429)` 발생 시 재시도
- LLM JSON 응답이 조금 깨져도 복구 시도
- 기본 모델 fallback은 `gemini-2.0-flash`
- `.env.example`의 권장 모델 값은 `gemini-2.5-flash`

### `backend/data/misconceptions`

시나리오 데이터 저장 위치입니다. 현재는 `boyles_law.json` 하나만 있습니다.

이 파일에는 다음이 들어 있습니다.

- 학생 기본 프로필
- 실험 상황 설명
- 학습지 내용
- 이미 아는 개념
- 오개념 목록
- 각 오개념에 대한 예시 Q&A

현재 등록 방식은 파일 자동 탐색이 아니라, `backend/main.py` 내부의 `_SCENARIOS` 딕셔너리에 수동 등록하는 구조입니다.

## 5. 프런트엔드 구조

### `frontend/src/app/page.tsx`

랜딩 페이지입니다.

- 사용 가능한 시나리오 카드 표시
- 시나리오 선택 시 `/session/start` 호출
- 반환받은 세션 정보를 `sessionStorage`에 저장
- `/session/{session_id}` 페이지로 이동

### `frontend/src/app/session/[id]/page.tsx`

실제 시뮬레이션 화면입니다.

- `sessionStorage`에서 시작 세션 정보 복원
- 좌측 학생 정보 패널 표시
- 중앙 채팅 패널 표시
- 우측 발문 효과 요약 패널 표시
- 리포트 조회 버튼으로 세션 분석 화면 전환

주의할 점:

- URL에 세션 ID가 있어도 `sessionStorage`에 세션 데이터가 없으면 홈으로 리다이렉트됩니다.
- 즉, 현재는 "URL만으로 세션 복구"가 되지 않습니다.

### `frontend/src/components/StudentInfoPanel.tsx`

학생 기본 정보와 오개념 해소 진행도를 표시합니다.

- 오개념별 레벨(`L0 ~ L4`)
- 진행 바
- 학습지 설명

### `frontend/src/components/ChatPanel.tsx`

교사와 학생의 대화 UI입니다.

- 교사 입력창
- 메시지 목록
- 학생 응답 로딩 상태
- 교사 발문 효과 배지
- 모든 오개념 해소 시 완료 메시지

### `frontend/src/components/SessionReport.tsx`

세션 종료 전후 분석용 리포트 화면입니다.

- 총 턴 수
- 해소/미해소 오개념 수
- 오개념별 최종 상태
- 효과적 발문 목록
- 턴별 시스템 판단 로그

### `frontend/src/lib/api.ts`

백엔드 API 통신 레이어입니다.

- `startSession`
- `sendMessage`
- `getReport`
- `endSession`

기본 API 주소는 아래와 같습니다.

```ts
process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
```

## 6. 핵심 상태 개념

### 오개념 해소 레벨

`resolution_level`은 0~4 단계입니다.

- `0`: 오개념을 확신함
- `1`: 약한 의심
- `2`: 혼란 상태
- `3`: 부분 이해
- `4`: 해소 완료

### 발문 효과 레벨

교사 질문은 오개념 기준으로 다음 셋 중 하나로 판정됩니다.

- `0`: 효과 없음
- `1`: 부분 효과
- `2`: 효과적

현재 구현에서는 `new_level = min(4, current_level + effect)` 규칙을 사용합니다.  
즉, 효과적인 발문일수록 해소 레벨이 더 빠르게 올라갑니다.

### 확신도(`confidence`)

효과가 있는 발문은 오개념 확신도를 낮춥니다.

- 효과 `2`: `-0.3`
- 효과 `1`: `-0.1`

이 값은 현재 주로 프롬프트 내 학생 상태 표현에 사용됩니다.

## 7. 전체 동작 흐름

아래가 이 프로젝트의 가장 중요한 end-to-end flow입니다.

### 1. 사용자가 시나리오를 선택한다

프런트 랜딩 페이지에서 시나리오 카드를 누르면 `POST /session/start`가 호출됩니다.

### 2. 백엔드가 학생 프로필로 세션을 생성한다

`backend/main.py`

1. 시나리오 키로 JSON 파일 조회
2. JSON을 `StudentProfile`로 변환
3. `create_session(profile)` 호출
4. 메모리 저장소에 `SessionState` 저장
5. 세션 ID, 학생 정보, 초기 오개념 상태 반환

### 3. 프런트가 세션 정보를 저장하고 세션 페이지로 이동한다

반환된 응답은 브라우저 `sessionStorage`에 저장되고, `/session/{id}` 화면으로 이동합니다.

### 4. 세션 페이지가 초기 상태를 구성한다

세션 페이지는 저장된 데이터를 읽어 다음을 초기화합니다.

- 학생 기본 정보
- 초기 오개념 해소 상태
- 빈 메시지 목록

### 5. 교사가 질문을 보낸다

채팅 입력창에서 발문을 보내면 `POST /session/{session_id}/chat`가 호출됩니다.

### 6. 백엔드가 이번 턴의 타깃 오개념을 고른다

`select_target_misconception(...)`

- 아직 해소되지 않은 오개념만 후보로 사용
- 교사 질문이 어떤 오개념을 가장 직접적으로 겨냥하는지 Gemini가 판단
- 직접 관련이 없으면 `null`

### 7. 발문의 효과를 판정한다

타깃 오개념이 있을 때만 `evaluate_teacher_question(...)`을 실행합니다.

- 오개념 핵심 모순을 직접 건드렸는지
- 인지 갈등을 유발하는지
- 단순 설명 반복이나 정답 제시인지

이 결과로 `effect`, `reason`, `new_level`이 계산됩니다.

### 8. 오개념 상태를 갱신한다

`update_misconception_level(...)`

- 해당 오개념의 `resolution_level` 갱신
- 효과에 따라 `confidence` 감소

### 9. 학생 반응 태도(dialogue act)를 결정한다

`determine_dialogue_act(...)`

입력:

- 현재 해소 레벨
- 이번 질문의 효과

출력:

- 반응 타입 키
- 학생 말투/태도 지시문

이 단계 덕분에 학생 응답은 단순 정오답이 아니라,  
"버티는 상태인지", "헷갈리는 상태인지", "부분 이해인지"를 반영하게 됩니다.

### 10. 프롬프트를 조립해 학생 응답을 생성한다

`build_chat_prompt(...)` → `generate_student_response(...)`

프롬프트에는 다음이 함께 들어갑니다.

- 학생 페르소나
- 모든 오개념과 현재 해소 레벨
- 이번 턴의 주요 오개념
- 기존 대화 요약
- 최근 대화 기록
- 이번 턴 반응 지시

그 결과 학생 응답은 현재 오개념 상태와 대화 문맥을 함께 반영하게 됩니다.

### 11. 세션 로그와 recap을 갱신한다

백엔드는 응답 생성 후 다음을 저장합니다.

- 교사 메시지
- 학생 메시지
- 효과적 발문 기록
- 시스템 판단 로그
- 최신 recap 요약

### 12. 프런트가 화면을 다시 그린다

응답으로 받은 값을 이용해:

- 학생 응답 추가
- 교사 발문에 효과 배지 부여
- 좌측 오개념 상태 갱신
- 전체 해소 여부 갱신

### 13. 사용자가 리포트를 본다

`GET /session/{session_id}/report`

리포트에는 다음이 포함됩니다.

- 총 턴 수
- 해소/미해소 오개념 개수
- 오개념별 최종 상태
- 효과적이었던 발문 목록
- 턴별 판단 로그

## 8. 요청/응답 흐름 요약

```text
[사용자]
  └─ 시나리오 선택
      └─ POST /session/start
          └─ StudentProfile 로드 + SessionState 생성

[사용자]
  └─ 교사 발문 입력
      └─ POST /session/{id}/chat
          ├─ 활성 오개념 조회
          ├─ 타깃 오개념 선택
          ├─ 발문 효과 판정
          ├─ 오개념 레벨/확신도 갱신
          ├─ dialogue act 결정
          ├─ 프롬프트 생성
          ├─ Gemini 학생 응답 생성
          ├─ 세션 로그 저장
          └─ recap 요약 갱신

[사용자]
  └─ 분석 로그 보기
      └─ GET /session/{id}/report
```

## 9. API 요약

### `GET /scenarios`

사용 가능한 시나리오 키 목록 반환

### `POST /session/start`

시나리오 기반 세션 생성

예시 요청:

```json
{
  "scenario": "boyles_law"
}
```

### `POST /session/{session_id}/chat`

교사 발문 전송, 학생 응답과 턴 분석 반환

예시 요청:

```json
{
  "teacher_message": "주사기를 눌러도 입자 수는 왜 그대로일까?"
}
```

응답 핵심 필드:

- `student_response`
- `turn_analysis`
- `misconception_states`
- `all_resolved`

### `GET /session/{session_id}/report`

세션 분석 리포트 반환

### `DELETE /session/{session_id}`

세션 종료

## 10. 실행 방법

### 사전 준비

- Python 3.11+ 권장
- Node.js 20+ 권장
- Gemini API Key 필요

루트에 `.env` 파일을 두고 아래 값을 설정합니다.

```env
GEMINI_API_KEY=your_real_key
GEMINI_MODEL=gemini-2.5-flash
```

### 백엔드 실행

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

기본 주소: `http://localhost:8000`

`main.py`가 `models`, `core`, `llm`를 상대적인 패키지 루트처럼 import하고 있으므로, 현재 구조에서는 `backend/` 디렉터리에서 실행하는 방식이 가장 안전합니다.

### 프런트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

기본 주소: `http://localhost:3000`

필요하면 `.env.local`에 API 주소를 지정할 수 있습니다.

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 11. 현재 구현된 시나리오

### `boyles_law`

학생 `이보`가 보일의 법칙 실험 후 다음 오개념을 가진 상태입니다.

- `B1`: 압력이 높아지면 입자 수가 줄어든다고 생각함
- `B2`: 압력이 높아지면 입자들이 한쪽으로 몰리거나 겹친다고 생각함
- `B3`: 압력이 높아지면 입자 운동 속도가 빨라진다고 생각함

즉, 이 시나리오는 `입자 수`, `입자 분포`, `압력-온도 혼동`을 분리된 오개념 축으로 관리합니다.

## 12. 새 시나리오 추가 방법

1. `backend/data/misconceptions/` 아래에 새 JSON 파일을 추가합니다.
2. `backend/main.py`의 `_SCENARIOS`에 키와 파일 경로를 등록합니다.
3. 프런트 `frontend/src/app/page.tsx`의 시나리오 카드 목록에 항목을 추가합니다.

새 JSON에는 최소한 다음 정보가 필요합니다.

- 학생 프로필
- 실험/학습 맥락
- 아는 개념 / 모르는 개념
- 오개념 목록
- 오개념별 예시 Q&A

## 13. 현재 한계와 개선 포인트

- 세션 저장소가 메모리 기반이라 서버 재시작 시 데이터가 사라집니다.
- `sessionStorage` 의존 때문에 새로고침/직접 URL 접근 시 세션 복구가 제한됩니다.
- CORS 허용 origin이 현재 `http://localhost:3000`으로 고정되어 있습니다.
- 시나리오 등록이 자동 스캔이 아니라 수동 딕셔너리 등록입니다.
- 테스트 코드가 아직 없습니다.
- 발문 평가 로직이 규칙 기반이 아니라 LLM 판정 기반이므로, 프롬프트와 모델에 따라 일관성이 흔들릴 수 있습니다.
- `frontend/README.md`는 아직 기본 Next.js 템플릿 문서 상태입니다.

## 14. 이 프로젝트를 한 문장으로 요약하면

`학생 오개념 상태를 추적하면서, 교사의 발문이 학생 이해를 어떻게 바꾸는지 시뮬레이션하는 LLM 기반 화학 교육 훈련 도구`입니다.
