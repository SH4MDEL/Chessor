/**
 * board.js — chessboard.js + chess.js 연동 모듈
 * 드래그앤드롭, 합법성 검증, FEN 동기화, Flip, Undo 처리
 */
(function () {
  'use strict';

  let board = null;
  let chess = null;
  let boardSize = 600;
  let onMoveCallback = null;

  /**
   * 드롭 이벤트 핸들러 — chess.js로 합법성 검증
   */
  function onDrop(source, target) {
    // 같은 자리로 드롭하면 무시
    if (source === target) return 'snapback';

    const move = chess.move({
      from: source,
      to: target,
      promotion: 'q', // 프로모션은 항상 퀸으로 자동 처리
    });

    // 불법 수 → 기물을 원래 자리로 되돌림
    if (move === null) return 'snapback';

    if (typeof onMoveCallback === 'function') {
      onMoveCallback();
    }
  }

  /**
   * 애니메이션 이후 보드 위치를 chess.js FEN에 맞춰 동기화
   */
  function onSnapEnd() {
    board.position(chess.fen());
  }

  // ──────────────────────────────────────────────
  //  Public API
  // ──────────────────────────────────────────────

  /**
   * 보드와 chess 엔진을 초기화한다.
   * @param {number} size - 보드 픽셀 크기
   * @param {function} moveCallback - 합법 수 처리 후 호출될 콜백
   */
  function init(size, moveCallback) {
    boardSize = size;
    onMoveCallback = moveCallback;

    chess = new Chess();

    board = Chessboard('board', {
      draggable: true,
      position: 'start',
      onDrop: onDrop,
      onSnapEnd: onSnapEnd,
      pieceTheme: 'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png',
      width: boardSize,
    });
  }

  /**
   * 마지막 수를 취소한다.
   * @returns {boolean} 취소 성공 여부
   */
  function undo() {
    if (chess.history().length === 0) return false;
    chess.undo();
    board.position(chess.fen(), false); // 애니메이션 없이 즉시 반영
    return true;
  }

  /** 보드 방향을 뒤집는다 */
  function flip() {
    board.flip();
  }

  /**
   * 현재 보드 방향을 반환한다.
   * @returns {'white' | 'black'}
   */
  function getOrientation() {
    return board.orientation();
  }

  /**
   * 현재 chess.js FEN을 반환한다.
   * @returns {string}
   */
  function getFen() {
    return chess.fen();
  }

  /**
   * 초기화된 보드 픽셀 크기를 반환한다.
   * @returns {number}
   */
  function getBoardSize() {
    return boardSize;
  }

  /**
   * 현재 포지션에서 합법 수 중 memoData에 저장된 FEN으로 이어지는 수를 반환한다.
   * 화살표 렌더링에 사용된다.
   * @returns {Array<{ from: string, to: string, quality: string }>}
   */
  function getMovesWithMemo() {
    const moves = chess.moves({ verbose: true });
    const seen = new Set();
    const result = [];

    for (const move of moves) {
      const key = move.from + move.to;
      // 같은 (from, to) 쌍이 여러 번 나올 수 있음 (프로모션 다중 선택 등)
      if (seen.has(key)) continue;
      seen.add(key);

      chess.move(move);
      const nextFen = chess.fen();
      chess.undo();

      if (Memo.hasMemo(nextFen)) {
        const entry = Memo.get(nextFen);
        result.push({
          from: move.from,
          to: move.to,
          quality: entry.quality || 'good',
        });
      }
    }

    return result;
  }

  window.Board = {
    init,
    undo,
    flip,
    getOrientation,
    getFen,
    getBoardSize,
    getMovesWithMemo,
  };
})();
