/**
 * app.js — 앱 진입점 및 이벤트 오케스트레이션
 * Board, Memo, Arrows 모듈을 연결하고 UI 이벤트를 처리한다.
 */
(function () {
  'use strict';

  const PANEL_WIDTH = 340;
  const PADDING = 24;

  /** 세로 방향(portrait) 화면인지 여부 — 보드 크기 계산에만 사용 */
  function isPortrait() {
    return window.innerWidth < window.innerHeight;
  }

  let currentFen = '';
  let currentQuality = 'good';

  // ──────────────────────────────────────────────
  //  Core update helpers
  // ──────────────────────────────────────────────

  /** 화살표를 재계산해 캔버스에 다시 그린다 */
  function redrawArrows() {
    const canvas = document.getElementById('arrow-canvas');
    const arrows = Board.getMovesWithMemo();
    Arrows.draw(canvas, arrows, Board.getBoardSize(), Board.getOrientation());
  }

  /** Quality 버튼의 활성 상태를 현재 quality에 맞게 갱신 */
  function syncQualityButtons() {
    const btnGood = document.getElementById('btn-good');
    const btnBad = document.getElementById('btn-bad');
    if (currentQuality === 'good') {
      btnGood.classList.add('active');
      btnBad.classList.remove('active');
    } else {
      btnBad.classList.add('active');
      btnGood.classList.remove('active');
    }
  }

  /**
   * 현재 FEN에 해당하는 메모를 UI에 로드한다.
   * 수를 두거나 Undo할 때마다 호출된다.
   */
  function loadMemoForCurrentFen() {
    currentFen = Board.getFen();
    const entry = Memo.get(currentFen);

    document.getElementById('memo-input').value = entry.text;
    document.getElementById('current-fen').textContent = currentFen;

    currentQuality = entry.quality || 'good';
    syncQualityButtons();

    redrawArrows();
  }

  /**
   * textarea + 현재 quality를 memoData에 저장한다.
   * 화살표도 재계산한다 (저장 내용이 이웃 포지션의 화살표에 영향을 줄 수 있으므로).
   */
  function saveCurrentMemo() {
    const text = document.getElementById('memo-input').value;
    Memo.set(currentFen, text, currentQuality);
    redrawArrows();
  }

  // ──────────────────────────────────────────────
  //  Button event handlers
  // ──────────────────────────────────────────────

  function onClickGood() {
    currentQuality = 'good';
    syncQualityButtons();
    saveCurrentMemo();
  }

  function onClickBad() {
    currentQuality = 'bad';
    syncQualityButtons();
    saveCurrentMemo();
  }

  function onClickClear() {
    document.getElementById('memo-input').value = '';
    saveCurrentMemo();
  }

  function onClickUndo() {
    if (Board.undo()) {
      loadMemoForCurrentFen();
    }
  }

  function onClickFlip() {
    Board.flip();
    redrawArrows();
  }

  function onClickLoad() {
    document.getElementById('file-input').click();
  }

  function onFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const data = JSON.parse(ev.target.result);
        Memo.load(data);
        loadMemoForCurrentFen();
      } catch {
        alert('JSON 파일 형식이 올바르지 않습니다.');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = ''; // 같은 파일 재선택 허용
  }

  /**
   * blob URL + <a download> 방식으로 파일을 저장한다.
   * 데스크톱 Chrome/Firefox/Edge, Android Chrome에서 동작한다.
   * URL.revokeObjectURL은 다운로드 시작 후 1초 뒤에 호출해
   * 일부 Android 브라우저에서 URL이 너무 일찍 해제되는 문제를 방지한다.
   */
  function blobDownload(json) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'memos.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function onClickExport() {
    const json = Memo.exportJSON();

    // iOS Safari는 <a download> + blob URL을 지원하지 않는다.
    // Web Share API의 파일 공유(iOS 15+ / Chrome Android 75+)를 먼저 시도하고,
    // 지원하지 않으면 blob 다운로드로 폴백한다.
    const file = new File([json], 'memos.json', { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Chessor 메모' })
        .catch(function (err) {
          // AbortError: 사용자가 공유 취소 → 무시
          // 그 외 오류: blob 다운로드로 폴백
          if (err.name !== 'AbortError') {
            blobDownload(json);
          }
        });
      return;
    }

    blobDownload(json);
  }

  // ──────────────────────────────────────────────
  //  Initialization
  // ──────────────────────────────────────────────

  function initCanvas(boardSize) {
    const canvas = document.getElementById('arrow-canvas');
    canvas.width = boardSize;
    canvas.height = boardSize;
  }

  function bindButtons() {
    document.getElementById('btn-good').addEventListener('click', onClickGood);
    document.getElementById('btn-bad').addEventListener('click', onClickBad);
    document.getElementById('btn-clear').addEventListener('click', onClickClear);
    document.getElementById('btn-undo').addEventListener('click', onClickUndo);
    document.getElementById('btn-flip').addEventListener('click', onClickFlip);
    document.getElementById('btn-load').addEventListener('click', onClickLoad);
    document.getElementById('btn-export').addEventListener('click', onClickExport);
    document.getElementById('file-input').addEventListener('change', onFileSelected);

    // 메모 입력 시 자동 저장
    document.getElementById('memo-input').addEventListener('input', saveCurrentMemo);
  }

  /**
   * 현재 화면 크기에 따라 보드 픽셀 크기를 계산한다.
   *
   * 세로(portrait): 가로 폭 전체를 보드에 할당하되 세로 공간의 58% 이내로 제한
   * 가로(landscape): 뷰포트 높이의 90% + 패널 제외 너비 중 더 작은 값
   *   → 고정 px 대신 비율로 상한을 두어 북마크 줄·작업 표시줄에 의한
   *     보드 잘림 현상을 방지한다.
   */
  function calcBoardSize() {
    if (isPortrait()) {
      const maxByWidth = window.innerWidth - PADDING;
      const maxByHeight = Math.floor(window.innerHeight * 0.58);
      return Math.floor(Math.min(maxByWidth, maxByHeight) / 8) * 8;
    }
    // 데스크톱: 높이는 뷰포트의 90% 이내, 너비는 패널 제외 영역 이내
    const maxByHeight = Math.floor(window.innerHeight * 0.90);
    const maxByWidth = window.innerWidth - PANEL_WIDTH - PADDING;
    return Math.floor(Math.min(maxByHeight, maxByWidth) / 8) * 8;
  }

  function init() {
    // localStorage에서 메모 데이터 복원
    Memo.init();

    const boardSize = calcBoardSize();
    initCanvas(boardSize);

    // 합법 수 처리 후 메모/화살표 갱신 콜백을 Board에 전달
    Board.init(boardSize, loadMemoForCurrentFen);

    bindButtons();

    // 초기 포지션 메모 로드
    loadMemoForCurrentFen();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
