# FE 코드 컨벤션

### 사용 기술

주요 언어 :

라이브러리 : React (Vite)

스타일 :

전역 상태 관리 :

서버 통신 : axios

---

## **Git/GitHub 사용 규칙**

### 커밋(commit)

**`Initial Commit`**

: 첫 커밋, 기본 틀 만들기

**`feat : asdf`**

: 컴포넌트 / 페이지 / 기능 추가

**`style : asdf`**

: 스타일 관련 코드 (CSS 등) 수정 / 추가

**`update : asdf`**

: 사소한 코드 수정

**`fix : asdf`**

: 오류 로직 수정

**`delete : asdf`**

: 파일 / 함수 / 컴포넌트 등 삭제

**`refactor : asdf`**

: 코드 정리 / 컴포넌트화 / 구조 정리

**`WIP : asdf`**

: 작업 중 (Work In Process: 중간 커밋, 오류 해결을 위한 코드 공유 등을 위한 커밋)

---

### 이슈(Issue)

**`feat : 추가 내용`**

: 컴포넌트 / 페이지 / 기능 추가

**`fix : 수정 내용`**

: UI / 로직 등 수정

**`refactor : 정리 내용`**

: 코드 정리 / 컴포넌트화 / 구조 정리

**`style : 수정 내용`**

: 디자인 수정

- 개발 도중 발생하는 컴포넌트화, 로직 수정, 디자인 수정 등 → 새 이슈 X, 커밋 메세지로 구분
- 필수 개발 이후 추가적으로 발생하는 컴포넌트화, 로직 수정, 디자인 수정 등 → 새 이슈 O

---

### 브랜치(Branch)

**`feature/#issueNumber-asdf`**

: 기능 / 화면 추가

**`fix/#issueNumber-asdf`**

: 버그 수정

**`refactor/#issueNumber-asdf`**

: 구조 개선

**`style/#issueNumber-asdf`**

: 스타일 작업

- 여러 화면이 합쳐져서 하나의 기능을 완성하는 경우 (회원가입 등) → 하나의 브랜치

---

### 폴더 구조 (수정 예정)

- app : App.tsx 관련 보관 폴더
- routes : 화면 경로 및 컴포넌트 선언 파일
- assets : 이미지 저장
- components : 재사용 가능한 UI
- common : 공통 컴포넌트 폴더
- pages : 페이지
- constants : 상수 선언
- dummy : 더미 데이터 선언 파일
- 그 외 필요 시 추가
- styles : 색상, 폰트 등 스타일 선언 파일
- utils : 재사용 가능한 함수 (Ex.날짜 포멧)
- api : 서버 통신 함수
- store : 전역 상태 저장 및 관리
- hooks : 재활용 가능한 로직 + 상태 (api 함수 호출, store 업데이트 가능)
- types : 타입 정의

---

### 네이밍 규칙

- 파일명 / 컴포넌트명(React 컴포넌트, 페이지, 컴포넌트 전용 스타일 파일) : PascalCase
- 엔트리 파일(index, main) : 고정 네이밍(`index.ts`, `main.tsx`)
- 토큰 / 스타일 값 / util / api / mixin 파일 : camelCase 또는 snake_case
- 함수 / 변수 / 상수 명 : camelCase
- 이벤트 핸들러 : handle + 이벤트 (Ex. `handleClick`, `handleSubmit`)
- 이벤트 콜백 props : on + 이벤트 (Ex. `onClick`, `onSubmit`)
- dummy : dummy + 사용처 (Ex. `dummyPosts`)
- Boolean 변수 : 질문형 (`is`, `has`, `can`, `should` 접두어 사용 — Ex. `isLoading`, `isLoggedIn`)

---

### 스타일 규칙

- 스타일 3개 이상 → 인라인 스타일 X
- 색상, 폰트 등은 웬만하면 styles에서 가져와 사용

---

### Hooks 규칙

- Hook 이름은 use로 시작
- UI 반환 X, 로직만

---

### API 호출 규칙

- api 폴더에서 코드 작성
- 필요한 코드가 이미 있는지 확인하고 있으면 가져와 사용 (중복 X)
- api 폴더에 커스텀 axios를 생성해 사용

---

### 주석 규칙

- 함수 작성 시 함수 상단에 함수 설명 주석 작성
- 변수 옆 변수 설명 주석 작성 권장
- JSX 내부 주석 최소화 (로딩 중, 모달과 같이 조건부 렌더링의 경우에는 조건 설명 주석 작성)

---

### 코드 리뷰 규칙 (수정 예정)

- 모든 PR은 최소 1명 이상 승인 후 머지
- PR에 작성 내용
- 구현한 뷰 (스크린샷)
- 구현한 컴포넌트 (혹은 컴포넌트화)
- 구현한 함수
- 더미데이터 이용 여부
- 이외 처리한 내용 (로딩 중 처리 등)
- 머지는 승인자가 수행
- 리뷰 포인트
- 컴포넌트 분리 여부
- 네이밍 규칙 준수 여부
- 주석 규칙 준수 여부
