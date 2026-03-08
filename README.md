# Chessor — 체스 오프닝 공부 도구

FEN 기반으로 포지션마다 메모와 정수/악수 표시를 남길 수 있는 체스 오프닝 공부 도구입니다.

## 기능

- 드래그앤드롭으로 기물 이동 (합법 수만 허용)
- 포지션별 메모 자동 저장 (localStorage)
- 정수(✔) / 악수(✘) 표시, 화살표 오버레이로 시각화
- 메모 JSON Export / Import
- 모바일(iPhone, iPad) 반응형 레이아웃

## 기술 스택

- HTML / CSS / JavaScript (바닐라)
- [chessboard.js](https://chessboardjs.com/) — 보드 UI
- [chess.js](https://github.com/jhlywa/chess.js) — 체스 규칙 엔진
- localStorage — 메모 영속 저장
