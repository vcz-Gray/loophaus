---
active: true
iteration: 1
session_id:
max_iterations: 20
completion_promise: "TADA"
started_at: "2026-03-15T02:41:04Z"
---

## 목표

ralph-codex 프로젝트에 vitest 테스트 스위트를 추가하고, 모든 핵심 로직을 테스트하며, 최종 빌드 검증을 수행한다.

## 레퍼런스

- Phase 1~2에서 생성된 ralph-codex/ 디렉토리
- 핵심 테스트 대상: lib/state.mjs, hooks/stop-hook.mjs, lib/paths.mjs, bin/install.mjs

## 작업 절차

1. 작업 목록에서 다음 미완료 항목을 선택한다.
2. 해당 파일을 생성/수정한다.
3. npx vitest run 으로 테스트 실행.
4. 실패 시 → 에러를 읽고 테스트 또는 소스를 수정, 다시 3번으로. 최대 5회 재시도.
5. 통과 시 → 다음 항목으로.
6. git add -A && git commit -m ':white_check_mark: <테스트 내용>'
7. 다음 항목으로 돌아가 1번부터 반복.

## 작업 목록

### 1. vitest 설정

- npm install --save-dev vitest
- vitest.config.mjs 생성 (ESM 모드)
- package.json scripts.test = 'vitest run'

### 2. state.mjs 테스트 (tests/state.test.mjs)

- readState(): 파일 없을 때 기본값 반환
- writeState(): 파일 생성 및 내용 검증
- resetState(): active=false 확인
- incrementIteration(): 카운터 증가 확인
- 디렉토리 자동 생성 확인
- 각 테스트는 임시 디렉토리(os.tmpdir)에서 실행, 테스트 후 정리

### 3. stop-hook.mjs 로직 테스트 (tests/stop-hook.test.mjs)

- stop-hook.mjs에서 핵심 로직을 testable 함수로 분리 (processStopHook(input, stateDir) → { exitCode, stdout, stderr })
- 테스트 케이스:
  a. active=false → exit 0, stdout 비어있음
  b. active=true, iteration < max → decision:block JSON 출력
  c. active=true, iteration >= max → active를 false로, exit 0
  d. active=true, transcript에 promise 포함 → active를 false로, exit 0
  e. 잘못된 stdin JSON → stderr에 에러, exit 0 (non-blocking)
  f. 상태 파일 없음 → exit 0 (graceful)

### 4. paths.mjs 테스트 (tests/paths.test.mjs)

- getCodexHome(): 기본 경로 반환 확인
- CODEX_HOME 환경변수 오버라이드 확인
- 모든 반환 경로에 슬래시 하드코딩 없음 확인 (path.sep 사용 검증)

### 5. install.mjs 테스트 (tests/install.test.mjs)

- --dry-run: 파일 시스템 변경 없음 확인
- hooks.json 머지: 기존 hooks가 보존되는지 확인
- 빈 디렉토리에 fresh install 확인
- 중복 설치 시 덮어쓰기 동작 확인

### 6. 최종 검증 & 정리

- npx vitest run 전체 통과 확인
- node --check 모든 .mjs 파일 일괄 확인
- package.json 유효성 (npm pack --dry-run 실행)
- README.md에 테스트 실행 방법 추가
- git add -A && git commit -m ':tada: v0.1.0 ready'

## 막혔을 때

5번 반복 후에도 실패하는 테스트가 남아 있으면:

- 해당 테스트를 test.skip()으로 마킹
- KNOWN_ISSUES.md에 실패 원인과 재현 방법 기록
- 나머지 테스트 계속 진행

## 완료 조건

- npx vitest run 이 exit code 0으로 완료
- 최소 15개 테스트 케이스 존재
- skip된 테스트가 2개 이하
- npm pack --dry-run 이 에러 없이 실행
- git log에 Phase 2 이후 최소 3개 추가 커밋 존재

Output <promise>TADA</promise>
