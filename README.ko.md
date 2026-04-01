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
  <img src="https://img.shields.io/badge/tests-296%20passing-brightgreen.svg?style=flat-square" alt="tests" />
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
              │  4. 품질 측정 (score 0-100)     │
              │  5. 개선 루프 (유지/폐기)        │
              │  6. 커밋 + progress 업데이트     │
              │  7. 종료 시도                   │
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
npm install -g @graypark/loophaus
loophaus install
```

> **참고:** `npx @graypark/loophaus install`은 일부 npm 버전에서 bin 해석 캐시 버그로 실패할 수 있습니다. 위의 글로벌 설치 방식을 권장합니다.

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
| 상태 파일 | `.loophaus/state.json` | `.loophaus/state.json` | `.loophaus/state.json` |

## 설치

### 글로벌 설치 (권장)

```bash
npm install -g @graypark/loophaus
loophaus install
```

### npx로 설치

```bash
npx @graypark/loophaus install
```

> `npx`는 일부 npm 버전에서 bin 해석 캐시 버그로 실패할 수 있습니다. 실패 시 위의 글로벌 설치를 사용하세요.

### 호스트별 설치

특정 호스트만 대상으로 설치:

```bash
loophaus install --claude              # Claude Code만
loophaus install --host codex-cli      # Codex CLI만
loophaus install --kiro                # Kiro CLI만
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
loophaus install     # 자동 감지 설치
loophaus status      # 설치 상태 확인
loophaus stats       # 루프 실행 통계
loophaus quality     # 품질 점수 측정
loophaus uninstall   # 제거
loophaus --version   # 버전 확인
```

## Quality Loop (v3.4.0+)

v3.4.0에서 도입된 **Quality Loop** — [karpathy/autoresearch](https://github.com/karpathy/autoresearch)의 실험→측정→유지/폐기 패턴을 코드 품질 개선에 적용.

테스트가 통과하면 "완료"로 처리하던 기존 방식 대신, `/loop-plan`이 이제 **품질을 측정**(0-100)하고 임계값을 충족할 때까지 **반복 개선**합니다.

```
Phase 4: 구현
     ↓
Phase 5: 측정 (score 0-100)
     ↓           ↑
Phase 6: 개선 루프
  점수 향상? → 유지 (commit)
  점수 하락? → 폐기 (git reset)
  최대 시도 도달? → 다음으로
     ↓
Phase 7: 보고서 (품질 점수 포함)
```

| autoresearch | loophaus |
|-------------|----------|
| `val_bpb` | quality score (가중치: tests, typecheck, lint, verify, diff, custom) |
| `results.tsv` | `.loophaus/results.tsv` |
| keep → advance | 점수 향상 → commit |
| discard → revert | 점수 하락 → `git reset --hard` |
| NEVER STOP | 스토리당 최대 3회 시도 (설정 가능) |

### 설정

```json
{
  "qualityThreshold": 80,
  "maxRefineAttempts": 3,
  "qualityConfig": {
    "weights": { "tests": 30, "typecheck": 25, "lint": 15, "verify": 15, "diff": 10, "custom": 5 }
  }
}
```

### CLI

```bash
loophaus quality                # 전체 스토리 품질 측정
loophaus quality --story US-001 # 특정 스토리 품질 측정
```

## 아키텍처

```
loophaus/
├── bin/
│   ├── loophaus.ts                   # CLI 진입점
│   ├── install.ts                    # 크로스 플랫폼 설치기
│   └── uninstall.ts                  # 제거기
├── core/
│   ├── types.ts                      # 공유 TypeScript 인터페이스
│   ├── engine.ts                     # 핵심 루프 엔진
│   ├── event-logger.ts              # 이벤트 추적
│   ├── quality-scorer.ts            # 품질 측정 (점수, 평가, 로깅)
│   ├── refine-loop.ts               # 유지/폐기 개선 로직
│   ├── validate.ts                  # PRD + 상태 스키마 검증
│   ├── policy.ts                    # 루프 정책 평가
│   ├── cost-tracker.ts              # 토큰 비용 추정
│   ├── trace-analyzer.ts            # 트레이스 분석 + 비교
│   ├── worktree.ts                  # Git 워크트리 관리
│   ├── merge-strategy.ts            # 병렬 머지 전략
│   ├── parallel-runner.ts           # 멀티 워크트리 오케스트레이션
│   ├── session.ts                   # 체크포인트 / 세션 관리
│   └── loop-registry.ts             # 멀티 루프 레지스트리
├── store/
│   └── state-store.ts               # 루프 상태 저장소
├── lib/
│   ├── paths.ts                     # 크로스 플랫폼 경로
│   └── stop-hook-core.ts            # 테스트 가능한 hook 로직
├── platforms/
│   ├── claude-code/installer.mjs    # 플러그인 캐시 설치기
│   ├── codex-cli/installer.mjs      # hooks.json 설치기
│   └── kiro-cli/installer.mjs       # agents/ + steering/ 설치기
├── hooks/
│   └── stop-hook.mjs                # 범용 Stop hook (Node.js)
├── commands/                        # 슬래시 커맨드 정의
├── skills/                          # 플랫폼별 스킬 정의
├── .claude-plugin/
│   └── plugin.json                  # Claude Code 마켓플레이스 매니페스트
├── dist/                            # 컴파일 출력 (tsc)
└── tests/                           # 296개 테스트 케이스 (vitest)
```

## PRD 포맷

loophaus는 `prd.json` 포맷을 사용합니다:

```json
{
  "project": "MyApp",
  "branchName": "feature/auth-system",
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
npm install -g @graypark/loophaus@latest
loophaus install --force
```

## 제거

```bash
loophaus uninstall
npm uninstall -g @graypark/loophaus
```

## 개발

```bash
npm install && npm test    # 296개 테스트
npm run typecheck          # TypeScript strict 모드
npm run build              # dist/로 컴파일
npx vitest                # watch 모드
```

## 라이선스

MIT

---

<p align="center">
  <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a>, <a href="https://github.com/openai/codex">Codex CLI</a>, <a href="https://kiro.dev">Kiro CLI</a>를 위해 만들어졌습니다
</p>
