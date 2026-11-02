# 개발 로그

> 최신 기록을 위에 추가한다. 자동 검사 결과와 브라우저에서 직접 확인한 결과는 나누어 적는다.

---

## 템플릿

```md
## YYYY-MM-DD · N단계 · 작업 제목

- 브랜치: feature/...
- 목표:

### 변경사항

-

### 결정 / 이유

-

### 자동 검증

- [ ] tsc - [ ] lint - [ ] test - [ ] build

### 브라우저 확인 (직접)

- [ ]

### 문제 / 다음 할 일

-
```

---

## 2026-11-02 · 0단계 · 기획 확정 및 문서화

- 브랜치: `feature/project-planning`
- 목표: 기획 검토, 확정 스펙·구현 계획·학습 노트 작성 (구현 없음)

### 변경사항

- `docs/PROJECT_SPEC.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DEV_LOG.md`, `docs/CORE_CONCEPTS.md` 추가

### 결정 / 이유

- 손글씨 원본은 획 배열로 관리 → 2D와 3D가 같은 그리기 함수를 공유
- drei 미사용, zustand는 3단계에 설치, vitest는 순수 함수 테스트용
- React 19.3에 고정 (R3F 9.8 peer 범위가 `<19.4`)
- 모바일은 필기만 지원하고 캐릭터 이동은 MVP 범위 밖

### 자동 검증

- 해당 없음 (코드 변경 없음)

### 문제 / 다음 할 일

- 사용자 검토 후 1단계 `feature/lantern-prototype` 시작
