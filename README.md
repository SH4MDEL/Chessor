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

## 저작권 및 라이선스

| 구성요소 | 저작자 | 라이선스 |
|---|---|---|
| chessboard.js (보드 UI 라이브러리) | Chris Oakman | [MIT License](https://github.com/oakmac/chessboardjs/blob/master/LICENSE) |
| chess.js (체스 규칙 엔진) | Jeff Hlywa | [MIT License](https://github.com/jhlywa/chess.js/blob/master/LICENSE) |
| 체스 기물 이미지 (Wikipedia 세트) | [Cburnett](https://en.wikipedia.org/wiki/User:Cburnett) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |

> **CC BY-SA 3.0 안내**: 체스 기물 이미지를 재배포하거나 수정·이용하는 경우, 원저작자(Cburnett)를 표시하고 동일한 조건(CC BY-SA)으로 공개해야 합니다.
