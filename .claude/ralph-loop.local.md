---
active: true
iteration: 1
session_id:
max_iterations: 15
completion_promise: "PHASE2_DONE"
started_at: "2026-03-15T02:12:55Z"
---

## 목표

ralph-codex 프로젝트에 크로스플랫폼 installer를 추가하고, npm 패키지로 배포 가능하게 만들며, README를 작성한다.

## 레퍼런스

- Phase 1에서 생성된 ralph-codex/ 디렉토리의 기존 파일들
- Codex CLI 설정 경로:
  - Unix: ~/.codex/
  - Windows: %USERPROFILE%\.codex\ (또는 CODEX_HOME 환경변수)
- hooks.json은 ~/.codex/hooks.json에 위치해야 함
- Codex의 slash commands는 ~/.codex/skills/ 또는 프로젝트 .codex/skills/에 SKILL.md로 배치

## 작업 절차

1. 작업 목록에서 다음 미완료 항목을 선택한다.
2. 해당 파일을 생성/수정한다.
3. 검증:
   - .mjs 파일: node --check <파일>
   - .json 파일: node -e 'JSON.parse(require("fs").readFileSync("<파일>"))'
   - install 스크립트: node bin/install.mjs --dry-run (dry-run 모드 구현 필수)
4. 실패 시 → 에러를 읽고 수정, 다시 3번으로.
5. 통과 시 → 다음 항목으로.
6. git add -A && git commit -m ':wrench: <작업 내용 요약>' (설정/도구 관련) 또는 ':memo: <내용>' (문서)
7. 다음 항목으로 돌아가 1번부터 반복.

## 작업 목록

### 1. 크로스플랫폼 경로 유틸 (lib/paths.mjs)

- getCodexHome(): CODEX_HOME || (Windows ? path.join(os.homedir(), '.codex') : path.join(os.homedir(), '.codex'))
- getHooksJsonPath(): path.join(getCodexHome(), 'hooks.json')
- getPluginInstallDir(): path.join(getCodexHome(), 'plugins', 'ralph-codex')
- isWindows(): process.platform === 'win32'
- 모든 경로에 path.join 사용 (슬래시 하드코딩 금지)

### 2. Installer (bin/install.mjs)

- #!/usr/bin/env node 셰뱅
- --dry-run 플래그: 실제 파일 변경 없이 계획만 출력
- --global 플래그: ~/.codex/ 에 설치 (기본값)
- --local 플래그: .codex/ (프로젝트 로컬)에 설치
- 설치 과정:
  a. 플러그인 파일을 설치 디렉토리로 복사 (hooks/, commands/, lib/)
  b. hooks.json 머지: 기존 hooks.json이 있으면 Stop 훅 배열에 추가, 없으면 새로 생성
  c. stop-hook.mjs의 command 경로를 설치된 실제 경로로 설정
  d. commands/\*.md를 Codex skills 디렉토리에 심볼릭 링크 또는 복사
  e. Windows: 심볼릭 링크 대신 항상 복사 사용
- 성공/실패 메시지 출력 (색상 없이 유니코드 체크/엑스 사용)
- 기존 설치가 있으면 덮어쓰기 전 확인 (--force로 스킵 가능)

### 3. Uninstaller (bin/uninstall.mjs)

- hooks.json에서 ralph-codex 관련 Stop hook 항목만 제거
- 플러그인 디렉토리 삭제
- skills에서 ralph-loop/cancel-ralph 관련 파일 제거
- 상태 파일 삭제

### 4. package.json 업데이트

- bin 필드 추가: { 'ralph-codex': './bin/install.mjs' }
- files 필드: ['bin/', 'hooks/', 'commands/', 'lib/', 'README.md', 'LICENSE']
- keywords: ['codex', 'ralph-loop', 'autonomous', 'ai-agent', 'cross-platform']
- scripts: { install: 'echo Run npx ralph-codex install', test: 'vitest run' }

### 5. README.md

- 프로젝트 설명: Codex CLI용 크로스플랫폼 Ralph Loop
- 요구사항: Node.js 18+, Codex CLI v0.114+
- 설치 방법 2가지: npx ralph-codex install / git clone 후 node bin/install.mjs
- 사용법: /ralph-loop, /cancel-ralph 커맨드 예시
- 프롬프트 작성 팁: Phase 분리, 완료 조건 객관화, 탈출구 명시
- Windows 특이사항: WSL 불필요, Git Bash 불필요
- 제거 방법: npx ralph-codex uninstall
- 라이선스: MIT

### 6. LICENSE (MIT)

## 막혔을 때

3번 반복 후에도 미완료 항목이 남아 있으면:

- TODO.md에 문제점 기록
- 나머지 항목 계속 진행

## 완료 조건

- bin/install.mjs --dry-run 이 에러 없이 실행되고 설치 계획을 출력
- bin/uninstall.mjs 가 node --check 통과
- lib/paths.mjs 가 node --check 통과
- package.json에 bin 필드가 존재하고 유효한 JSON
- README.md가 존재하고 500자 이상
- git log에 Phase 1 이후 최소 3개 추가 커밋 존재

Output <promise>PHASE2_DONE</promise>
