/**
 * board.js — chessboard.js + chess.js 연동 모듈
 * 클릭-투-무브(데스크톱·모바일 공통), 합법성 검증, FEN 동기화, Flip, Undo 처리
 */
(function () {
  'use strict';

  let board = null;
  let chess = null;
  let boardSize = 600;
  let onMoveCallback = null;

  // ──────────────────────────────────────────────
  //  클릭-투-무브 (데스크톱·모바일 공통)
  // ──────────────────────────────────────────────

  let selectedSquare = null;

  /**
   * 클릭된 DOM 요소에서 체스 칸 이름(예: 'e4')을 추출한다.
   * chessboard.js는 각 칸 div에 'square-e4' 형식의 클래스를 붙인다.
   */
  function getSquareFromEl(el) {
    let current = el;
    while (current) {
      const cls = Array.from(current.classList || []).find(c => /^square-[a-h][1-8]$/.test(c));
      if (cls) return cls.replace('square-', '');
      current = current.parentElement;
    }
    return null;
  }

  function highlightSquare(square) {
    const el = document.querySelector('.square-' + square);
    if (el) el.classList.add('highlight-selected');
  }

  function highlightValidMoves(square) {
    chess.moves({ square, verbose: true }).forEach(function (move) {
      const el = document.querySelector('.square-' + move.to);
      if (el) el.classList.add('highlight-valid');
    });
  }

  function clearHighlights() {
    document.querySelectorAll('.highlight-selected, .highlight-valid').forEach(function (el) {
      el.classList.remove('highlight-selected', 'highlight-valid');
    });
  }

  function handleSquareClick(square) {
    if (!selectedSquare) {
      // 첫 번째 탭: 현재 차례의 기물을 선택
      const piece = chess.get(square);
      if (piece && piece.color === chess.turn()) {
        selectedSquare = square;
        clearHighlights();
        highlightSquare(square);
        highlightValidMoves(square);
      }
    } else {
      if (square === selectedSquare) {
        // 같은 칸 재탭: 선택 해제
        selectedSquare = null;
        clearHighlights();
      } else {
        const move = chess.move({ from: selectedSquare, to: square, promotion: 'q' });
        if (move === null) {
          // 불법 수: 새 기물 선택 시도
          const piece = chess.get(square);
          clearHighlights();
          if (piece && piece.color === chess.turn()) {
            selectedSquare = square;
            highlightSquare(square);
            highlightValidMoves(square);
          } else {
            selectedSquare = null;
          }
        } else {
          // 합법 수: 이동 완료
          board.position(chess.fen());
          selectedSquare = null;
          clearHighlights();
          if (typeof onMoveCallback === 'function') onMoveCallback();
        }
      }
    }
  }

  function initClickMove() {
    const boardEl = document.getElementById('board');

    // 터치 이벤트 처리 전략:
    //   touchstart.preventDefault() → 스크롤 차단 + 이후 합성 click 이벤트 취소
    //   touchend                    → 실제 이동 처리 (손가락을 뗀 위치 기준)
    //   click                       → 마우스 전용 (터치 시 touchstart.preventDefault()로 미발생)
    //
    // touchstart에서 이동을 처리하면 KakaoTalk 등 인앱 브라우저에서
    // preventDefault() 이후의 이벤트 체인이 달라져 동작 불일치가 생기므로
    // touchend에서 changedTouches로 위치를 확인해 처리한다.

    boardEl.addEventListener('touchstart', function (e) {
      e.preventDefault(); // 스크롤 차단
    }, { passive: false });

    boardEl.addEventListener('touchend', function (e) {
      const touch = e.changedTouches[0];
      // changedTouches 위치로 손가락을 뗀 요소를 정확히 파악
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const square = getSquareFromEl(el);
      if (square) handleSquareClick(square);
    });

    // 마우스 클릭 (touchstart.preventDefault() 덕분에 터치 시 자동으로 미발생)
    boardEl.addEventListener('click', function (e) {
      const square = getSquareFromEl(e.target);
      if (square) handleSquareClick(square);
    });
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

    // chessboard.js는 JS 옵션으로 크기를 받지 않고 컨테이너 요소의 CSS 너비를 읽는다.
    document.getElementById('board').style.width = boardSize + 'px';

    board = Chessboard('board', {
      draggable: false,
      position: 'start',
      pieceTheme: 'https://cdn.jsdelivr.net/gh/oakmac/chessboardjs/website/img/chesspieces/wikipedia/{piece}.png',
    });
    initClickMove();
  }

  /**
   * 마지막 수를 취소한다.
   * @returns {boolean} 취소 성공 여부
   */
  function undo() {
    if (chess.history().length === 0) return false;
    chess.undo();
    board.position(chess.fen(), false);
    selectedSquare = null;
    clearHighlights();
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
   * FEN을 3필드(기물 배치·차례·캐슬링 권리)로 정규화한다.
   * - 앙파상 필드: chess.js는 실제 포획 가능 여부와 무관하게 대상 칸을 기록하지만,
   *   타 구현(python-chess 구버전 등)은 불가능할 때 '-'로 기록한다.
   *   오프닝 연구 도구에서 이 차이가 키 불일치를 유발하므로 제거한다.
   * - 반수 시계·수 번호: 트랜스포지션 처리를 위해 제거한다.
   * 예) "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
   *   → "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq"
   * @param {string} fen
   * @returns {string}
   */
  function normalizeFen(fen) {
    return fen.split(' ').slice(0, 3).join(' ');
  }

  /**
   * 현재 포지션의 FEN을 4필드(기물·차례·캐슬링·앙파상)만 반환한다.
   * @returns {string}
   */
  function getFen() {
    return normalizeFen(chess.fen());
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
      const nextFen = normalizeFen(chess.fen());
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
