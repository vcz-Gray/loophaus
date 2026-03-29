[English](README.md) | [한국어](README.ko.md)

<p align="center">
  <img src="https://raw.githubusercontent.com/vcz-Gray/loophaus/main/assets/loophaus-banner.svg" alt="loophaus" width="600" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@graypark/loophaus"><img src="https://img.shields.io/npm/v/@graypark/loophaus.svg?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@graypark/loophaus"><img src="https://img.shields.io/npm/dm/@graypark/loophaus.svg?style=flat-square&color=green" alt="npm downloads" /></a>
  <a href="https://github.com/vcz-Gray/loophaus/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg?style=flat-square" alt="node version" />
  <img src="https://img.shields.io/badge/platform-Claude%20Code%20%7C%20Codex%20CLI%20%7C%20Kiro%20CLI-purple.svg?style=flat-square" alt="platform" />
  <img src="https://img.shields.io/badge/tests-36%20passing-brightgreen.svg?style=flat-square" alt="tests" />
</p>

<p align="center">
  <b>코딩 에이전트를 위한 컨트롤 플레인 — Claude Code, Codex CLI, Kiro CLI에서 동작하는 반복형 개발 루프.</b>
  <br/>
  <sub><a href="https://ghuntley.com/ralph/">Geoffrey Huntley의 Ralph Wiggum 기법</a> 기반</sub>
</p>

---

## 왜 loophaus인가?

AI 코딩 에이전트는 다음과 같은 문제를 겪습니다:

| 문제 | 현상 |
| --- | --- |
| **컨텍스트 부패** | 긴 대화가 노이즈를 축적, 에이전트가 혼란에 빠짐 |
| **체크포인트 없음** | 전부 아니면 전무 — 중단 후 재개 불가 |
| **학습 손실** | 이전 반복의 인사이트가 새 컨텍스트에 덮어쓰임 |
| **완료 모호성** | 에이전트가 "완료"라 하지만 테스트는 실패 |

loophaus는 이렇게 해결합니다:

- **반복마다 신선한 컨텍스트** — 매 사이클마다 디스크에서 PRD + 진행 상황을 읽어, 품질 저하 없음
- **Git 기반 안전장치** — 스토리별 원자적 커밋, 언제든 롤백 가능
- **추가 전용 학습** — `progress.txt`가 반복을 거듭하며 지식을 축적
- **테스트 검증 완료** — `<promise>COMPLETE</promise>`가 실제로 참일 때만 종료 가능

## 동작 원리

AI 에이전트가 연속 루프에서 태스크를 수행합니다. 매 반복은 **신선한 컨텍스트**로 시작합니다 — PRD와 진행 파일을 읽어 다음 할 일을 결정합니다. 에이전트는 하나의 스토리를 구현하고, 커밋하고, 진행 상황을 업데이트하고, 종료합니다. Stop hook이 종료를 가로채 프롬프트를 다시 주입합니다. 모든 스토리가 통과할 때까지 반복합니다.

```
                    ┌──────────────────────┐
                    │    /loop-plan        │
                    │    태스크 설명        │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   prd.json 생성      │
                    │   + progress.txt     │
                    └──────────┬───────────┘
                               │
              ┌────────────────▼────────────────┐
              │           루프 실행              │
              │                                 │
              │  1. prd.json + progress 읽기    │
              │  2. 다음 스토리 선택 (passes=false)│
              │  3. 구현 + 검증                 │
              │  4. 커밋 + progress 업데이트     │
              │  5. 종료 시도                   │
              │         │                       │
              │    Stop Hook이 가로채기         │
              │    프롬프트 재주입               │
              │         │                       │
              │    1단계로 복귀 ────────────────┘
              │                                 │
              │  모든 스토리 통과?               │
              │  → <promise>COMPLETE</promise>  │
              └─────────────────────────────────┘
```

## 빠른 시작

```bash
npx @graypark/loophaus install
```

이후 AI 코딩 세션에서:

```
/loop-plan JWT, bcrypt, 로그인 UI를 포함한 사용자 인증 추가
```

그게 전부입니다. 인터뷰가 PRD를 생성하고, 루프를 활성화하고, 스토리별로 구현을 시작합니다.

## 커맨드

> **Bauhaus** — 형태는 기능을 따른다.

| 커맨드 | 설명 |
| --- | --- |
| `/loop-plan` | 인터뷰 → PRD 생성 → 루프 시작 |
| `/loop` | 반복 실행 |
| `/loop-stop` | 루프 중단 |
| `/loop-pulse` | 상태 확인 |

### `/loop-plan` — 메인 진입점

태스크에 대해 인터뷰하고, 적절한 크기의 스토리로 PRD를 생성하고, 루프를 활성화한 다음 즉시 작업을 시작합니다.

```
/loop-plan 프론트엔드와 백엔드에 걸친 인증 모듈 리팩토링
```

**동작 과정:**

1. 3~5개의 타겟 질문 (범위, 검증, 병렬성 등)
2. 적절한 크기와 순서의 스토리가 포함된 `prd.json` 생성
3. 반복 추적을 위한 `progress.txt` 작성
4. Stop hook 활성화 및 US-001 구현 시작

**즉시 실행** — "준비됐나요?" 프롬프트 생략:

```
/loop-plan 사용자 API에 페이지네이션 추가, 바로 실행
```

### `/loop` — 직접 루프

이미 PRD가 있거나 직접 프롬프트를 작성하고 싶을 때:

```
/loop "prd.json 읽기, 다음 스토리 선택, 구현, 검증, 커밋" --max-iterations 20 --completion-promise "COMPLETE"
```

### `/loop-stop` — 중단

```
/loop-stop
```

### `/loop-pulse` — 상태 확인

현재 루프의 진행 상황, 완료된 스토리 수, 남은 반복 수를 확인합니다.

```
/loop-pulse
```

## 플랫폼 지원

loophaus는 세 개의 주요 코딩 에이전트 플랫폼을 지원합니다:

| 기능 | Claude Code | Codex CLI | Kiro CLI |
| --- | --- | --- | --- |
| 자동 감지 설치 | `~/.claude/` | `~/.codex/` | `~/.kiro/` |
| Stop hook | bash 기반 | Node.js 기반 | bash 기반 |
| 루프 실행 | Skill tool | 네이티브 커맨드 | 네이티브 커맨드 |
| 멀티 에이전트 | Agent tool | 서브에이전트 | 서브에이전트 |
| 상태 파일 | `.claude/ralph-loop.local.md` | `progress.txt` | `progress.txt` |

## 설치

### 자동 감지 설치 (권장)

설치된 호스트를 자동으로 감지하여 설치합니다:

```bash
npx @graypark/loophaus install
```

### 호스트별 설치

특정 호스트만 대상으로 설치:

```bash
npx @graypark/loophaus install --claude    # Claude Code만
npx @graypark/loophaus install --host codex-cli  # Codex CLI만
npx @graypark/loophaus install --kiro      # Kiro CLI만
```

| 플래그 | 설명 |
| --- | --- |
| `--host <name>` | 특정 호스트 대상 지정 |
| `--claude` | `--host claude-code` 축약형 |
| `--kiro` | `--host kiro-cli` 축약형 |
| `--local` | 프로젝트 로컬 `.codex/`에 설치 (Codex만) |
| `--dry-run` | 변경 없이 미리보기 |
| `--force` | 기존 파일 덮어쓰기 |

<details>
<summary>설치되는 항목</summary>

```
~/.codex/                          # (또는 ~/.claude/, ~/.kiro/)
├── plugins/loophaus/              # 핵심 플러그인 파일
├── hooks.json                     # Stop hook (기존 설정과 병합)
└── skills/
    ├── loop/                      # /loop — 루프 실행
    ├── loop-plan/                 # /loop-plan — PRD 생성 + 루프 시작
    ├── loop-stop/                 # /loop-stop — 루프 중단
    └── loop-pulse/                # /loop-pulse — 상태 확인
```

</details>

## CLI

```bash
npx @graypark/loophaus install     # 자동 감지 설치
npx @graypark/loophaus status      # 설치 상태 확인
npx @graypark/loophaus stats       # 루프 실행 통계
npx @graypark/loophaus uninstall   # 제거
npx @graypark/loophaus --version   # 버전 확인
```

## 아키텍처

```
loophaus/
├── .claude-plugin/plugin.json        # Claude Code 마켓플레이스 매니페스트
├── bin/
│   ├── loophaus.mjs                  # CLI 진입점
│   ├── install.mjs                   # 크로스 플랫폼 설치기
│   └── uninstall.mjs                 # 제거기
├── hooks/
│   └── stop-hook.mjs                 # 핵심 루프 엔진 (Node.js)
├── commands/
│   ├── loop.md                       # /loop 커맨드
│   ├── loop-plan.md                  # /loop-plan 커맨드
│   ├── loop-stop.md                  # /loop-stop 커맨드
│   ├── loop-pulse.md                 # /loop-pulse 커맨드
│   └── help.md                       # /help 커맨드
├── platforms/                        # 호스트별 어댑터
├── store/                            # 상태 저장소
├── core/                             # 핵심 로직
├── skills/
│   ├── ralph-interview/SKILL.md          # Codex: 인터랙티브 커맨드 생성기
│   ├── ralph-orchestrator/SKILL.md       # Codex: 멀티 에이전트 패턴
│   ├── ralph-claude-interview/SKILL.md   # Claude: 인터뷰 + Skill tool 호출
│   ├── ralph-claude-loop/SKILL.md        # Claude: PRD 기반 루프
│   ├── ralph-claude-cancel/SKILL.md      # Claude: 루프 취소
│   └── ralph-claude-orchestrator/SKILL.md # Claude: Agent tool 패턴
├── lib/
│   ├── paths.mjs                     # 크로스 플랫폼 경로
│   ├── state.mjs                     # 루프 상태 관리
│   └── stop-hook-core.mjs            # 테스트 가능한 hook 로직
└── tests/                            # 36개 테스트 케이스 (vitest)
```

## PRD 포맷

loophaus는 **ralph-skills 호환** `prd.json` 포맷을 사용합니다:

```json
{
  "project": "MyApp",
  "branchName": "ralph/auth-system",
  "description": "JWT 인증 시스템과 로그인 UI",
  "userStories": [
    {
      "id": "US-001",
      "title": "password hash를 포함한 users 테이블 추가",
      "description": "개발자로서, 인증을 위한 사용자 저장소가 필요합니다",
      "acceptanceCriteria": [
        "email, password_hash 컬럼이 있는 Users 테이블",
        "마이그레이션 정상 실행",
        "타입 체크 통과"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

각 스토리는 **한 번의 반복**(하나의 컨텍스트 윈도우)에서 완료할 수 있는 크기입니다. 의존성은 priority 순으로 정렬됩니다.

## ralph-codex에서 마이그레이션

기존에 `ralph-codex`를 사용하고 있었다면, loophaus가 자동으로 마이그레이션을 처리합니다:

- **상태 파일 호환** — 기존 `prd.json`과 `progress.txt`를 그대로 사용 가능
- **자동 감지** — 설치 시 기존 ralph-codex 설정을 감지하고 loophaus 포맷으로 업그레이드
- **커맨드 매핑** — 기존 `/ralph-interview` → `/loop-plan`, `/ralph-loop` → `/loop`, `/cancel-ralph` → `/loop-stop`

마이그레이션 방법:

```bash
# 기존 ralph-codex 제거
npx @graypark/ralph-codex uninstall

# loophaus 설치 (기존 상태 파일 자동 인식)
npx @graypark/loophaus install
```

기존 PRD 파일은 수정 없이 그대로 동작합니다. `progress.txt`에 축적된 학습 내용도 보존됩니다.

## 생태계 호환성

loophaus는 기존 Ralph 도구들과 호환됩니다:

| 도구 | 호환성 |
| --- | --- |
| `ralph-skills:prd` | 동일한 `prd.json` 포맷 — 거기서 PRD를 생성하고 여기서 루프 실행 |
| `ralph-skills:ralph` | 동일한 `progress.txt`, `passes` 추적, `COMPLETE` promise |
| 공식 `ralph-loop` 플러그인 | PRD 파일이 양쪽 stop hook에서 동작 |
| `snarktank/ralph` | 호환되는 PRD 구조 및 반복 패턴 |

## 멀티 에이전트 오케스트레이션

여러 서비스에 걸치거나 광범위한 탐색이 필요한 태스크에 사용합니다:

```
Phase 1 — 병렬 스캔 (3 에이전트):
├── 에이전트 "fe-scan": frontend/** 인증 취약점 탐색
├── 에이전트 "be-scan": backend/** 인증 취약점 탐색
└── 에이전트 "db-scan": 스키마의 누락된 제약조건 검토

Phase 2 — 순차 수정 (루프):
└── 병합된 발견사항 읽기 → 스토리별로 수정 구현
```

인터뷰 과정에서 병렬성 잠재력을 점수 매트릭스로 자동 평가합니다.

5가지 오케스트레이션 패턴:

| 패턴 | 사용 시점 |
| --- | --- |
| 병렬 탐색 → 순차 구현 | 대규모 코드베이스 조사 후 수정 |
| 소유권 분할 | 멀티 서비스 변경 (fe + be + auth) |
| Fan-Out / Fan-In | 병렬 감사 (보안 + 성능 + 접근성) |
| 정찰 후 실행 | 익숙하지 않은 코드베이스 |
| 체크포인트가 있는 파이프라인 | 다단계 변환 |

## 업데이트

```bash
npx @graypark/loophaus install --force
```

## 제거

```bash
npx @graypark/loophaus uninstall
```

## 개발

```bash
npm install && npm test   # 36개 테스트
npx vitest                # watch 모드
```

## 라이선스

MIT

---

<p align="center">
  <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a>, <a href="https://github.com/openai/codex">Codex CLI</a>, <a href="https://kiro.dev">Kiro CLI</a>를 위해 만들어졌습니다
</p>
