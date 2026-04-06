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
  <img src="https://img.shields.io/badge/tests-359%20passing-brightgreen.svg?style=flat-square" alt="tests" />
</p>

<h3 align="center">AI 코딩 에이전트를 자율 루프로 실행 — 매 반복마다 신선한 컨텍스트, PRD 기반 진행 추적, 자동 품질 게이트.</h3>

<p align="center">
  <sub><a href="https://ghuntley.com/ralph/">Geoffrey Huntley의 Ralph Wiggum 기법</a> 기반</sub>
</p>

---

## 문제

AI 코딩 에이전트는 긴 작업에서 어려움을 겪습니다:

- **컨텍스트 부패** — 10회 이상 반복하면 에이전트가 혼란에 빠짐
- **목표 이탈** — 에이전트가 스펙을 잊고 엉뚱한 문제를 해결
- **품질 신호 부재** — 에이전트가 "완료"라 하지만 테스트는 여전히 실패
- **토큰 낭비** — 매번 같은 컨텍스트를 다시 설명해야 함

## 해결책

- **반복마다 신선한 컨텍스트** — 매 사이클마다 디스크에서 PRD + 진행 상황을 읽어, 20회 이상 반복해도 품질 저하 없음
- **PRD 연동 진행 추적** — `prd.json`에 스토리별 pass/fail 상태 추적, "끝난 것 같다"가 아닌 구조화된 추적
- **품질 측정과 유지/폐기** — Autoresearch 패턴에서 영감을 받은 개선 루프가 품질(0-100)을 측정하고 퇴보를 되돌림
- **범용 Stop hook** — 하나의 Node.js hook이 Claude Code, Codex CLI, Kiro CLI 모두에서 동작

## 빠른 시작

```bash
npm install -g @graypark/loophaus
loophaus install
```

> **참고:** `npx @graypark/loophaus install`은 일부 npm 버전에서 bin 해석 캐시 버그로 실패할 수 있습니다. 위의 글로벌 설치 방식을 권장합니다.

설치기가 호스트(Claude Code, Codex CLI, Kiro CLI)를 자동 감지하고 stop hook, 커맨드, 스킬을 모두 설정합니다.

이후 AI 코딩 세션에서:

```
/loop-plan JWT, bcrypt, 로그인 UI를 포함한 사용자 인증 추가
```

그게 전부입니다. 인터뷰가 PRD를 생성하고, 루프를 활성화하고, 스토리별로 구현을 시작합니다.

## 안전장치

- 매 반복마다 **git 체크포인트** 생성 — 언제든 원자적 되돌리기
- **최대 반복 제한** (기본 20, 설정 가능)
- **품질 임계값 = 서킷 브레이커** — score < 80이면 개선 또는 중단
- **비용 추적**과 정책 적용 (최대 $5, 최대 30분)
- `loophaus clean`으로 데이터 생명주기 관리

## 스크립트로 하면 안 되나요?

1. **신선한 컨텍스트 격리** — 20회 반복 후에도 저하 없음; 매 사이클이 퇴화하는 대화가 아닌 디스크에서 시작
2. **PRD 연동 진행 추적** — 스토리별 pass/fail이 있는 구조화된 `prd.json`, "끝난 것 같다"가 아님
3. **품질 측정과 유지/폐기** — autoresearch 패턴: 측정, 개선 유지, 퇴보 되돌리기

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
              │                                 │
              │  /loop-pulse → 상태 확인        │
              │  /loop-stop  → 언제든 취소      │
              └─────────────────────────────────┘
```

## 커맨드

| 커맨드 | 설명 |
|---------|-------------|
| `/loop-plan` | 인터뷰 → PRD 생성 → 루프 활성화 |
| `/loop` | 직접 반복 실행 (PRD가 이미 있을 때) |
| `/loop-stop` | 활성 루프 즉시 중단 |
| `/loop-pulse` | 현재 루프 상태, 반복 횟수, 진행 상황 확인 |

## Quality Loop (v3.4.0+)

v3.4.0에서 도입된 **Quality Loop** — [karpathy/autoresearch](https://github.com/karpathy/autoresearch)의 실험-측정-유지/폐기 패턴을 코드 품질 개선에 적용.

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

## 플랫폼 지원

| | Claude Code | Codex CLI | Kiro CLI |
|---|---|---|---|
| **Stop Hook** | Node.js | Node.js | Node.js |
| **설치 대상** | Plugin cache | `hooks.json` | `agents/` + `steering/` |
| **커맨드** | `/reload-plugins` | native | steering manual mode |
| **멀티 에이전트** | Agent tool | subprocesses | steering agents |

세 플랫폼 모두 같은 코어 엔진(`core/engine.ts`)과 상태 저장소(`store/state-store.ts`)를 공유합니다. 플랫폼별 어댑터가 차이를 처리합니다.

Windows에서도 PowerShell/CMD 기준으로 `install`, `upgrade`, `/loop` 초기화가 동작합니다. Git Bash나 WSL은 선택사항입니다.

## 설치

### 글로벌 설치 (권장)

```bash
npm install -g @graypark/loophaus
loophaus install
```

Windows에서는 전역 npm 실행 파일 경로(보통 `%AppData%\npm`)가 `PATH`에 포함되어 있어야 합니다.

### npx로 설치

```bash
npx @graypark/loophaus install
```

> `npx`는 일부 npm 버전에서 bin 해석 캐시 버그로 실패할 수 있습니다. 실패 시 위의 글로벌 설치를 사용하세요.

### 호스트별 설치

```bash
loophaus install --host claude-code
loophaus install --host codex-cli
loophaus install --host kiro-cli
```

### 플래그

| 플래그 | 설명 |
|------|-------------|
| `--force` | 기존 파일 덮어쓰기 |
| `--dry-run` | 변경 없이 미리보기 |
| `--local` | 프로젝트 로컬 설치 (Codex CLI만) |

## CLI

```bash
loophaus install          # 자동 감지 설치
loophaus status           # 설치 상태 확인
loophaus stats            # 루프 실행 통계
loophaus quality          # 품질 점수 측정
loophaus demo             # 대화형 데모 실행
loophaus config           # 설정 확인/수정
loophaus update-check     # 새 버전 확인
loophaus upgrade          # 최신 버전으로 업그레이드
loophaus uninstall        # 제거
```

## 아키텍처

```
loophaus/
├── bin/
│   ├── loophaus.ts               # CLI 진입점
│   ├── install.ts                # 크로스 플랫폼 설치기
│   └── uninstall.ts              # 제거기
├── core/
│   ├── types.ts                  # 공유 TypeScript 인터페이스
│   ├── engine.ts                 # 핵심 루프 엔진
│   ├── event-logger.ts           # 이벤트 추적
│   ├── quality-scorer.ts         # 품질 측정 (점수, 평가, 로깅)
│   ├── refine-loop.ts            # 유지/폐기 개선 로직
│   ├── validate.ts               # PRD + 상태 스키마 검증
│   ├── policy.ts                 # 루프 정책 평가
│   ├── cost-tracker.ts           # 토큰 비용 추정
│   ├── trace-analyzer.ts         # 트레이스 분석 + 비교
│   ├── worktree.ts               # Git 워크트리 관리
│   ├── merge-strategy.ts         # 병렬 머지 전략
│   ├── parallel-runner.ts        # 멀티 워크트리 오케스트레이션
│   ├── session.ts                # 체크포인트 / 세션 관리
│   └── loop-registry.ts          # 멀티 루프 레지스트리
├── store/
│   └── state-store.ts            # 루프 상태 저장소
├── lib/
│   ├── paths.ts                  # 크로스 플랫폼 경로
│   └── stop-hook-core.ts         # 테스트 가능한 hook 로직
├── platforms/
│   ├── claude-code/installer.mjs # 플러그인 캐시 설치기
│   ├── codex-cli/installer.mjs   # hooks.json 설치기
│   └── kiro-cli/installer.mjs    # agents/ + steering/ 설치기
├── hooks/
│   └── stop-hook.mjs             # 범용 Stop hook (Node.js)
├── commands/                     # 슬래시 커맨드 정의
├── skills/                       # 플랫폼별 스킬 정의
├── .claude-plugin/
│   └── plugin.json               # Claude Code 마켓플레이스 매니페스트
├── dist/                         # 컴파일 출력 (tsc)
└── tests/                        # 359개 테스트 케이스 (vitest)
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

각 스토리는 **한 번의 반복**(하나의 컨텍스트 윈도우)에서 완료할 수 있는 크기입니다. 의존성은 priority 순으로 정렬됩니다. 루프 엔진이 `passes`가 `false`인 다음 스토리를 선택해 검증이 성공할 때까지 작업합니다.

## 업데이트

```bash
loophaus upgrade
```

수동 업데이트가 필요하면:

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
git clone https://github.com/vcz-Gray/loophaus.git
cd loophaus
npm install
npm test               # 359개 테스트
npm run typecheck      # TypeScript strict 모드
npm run build          # dist/로 컴파일
npx vitest             # watch 모드
```

## 라이선스

MIT

---

<p align="center">
  <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a>, <a href="https://github.com/openai/codex">Codex CLI</a>, <a href="https://kiro.dev">Kiro CLI</a>를 위해 만들어졌습니다
</p>
