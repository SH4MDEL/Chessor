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

  /** Undo 버튼의 활성/비활성 상태를 현재 히스토리에 맞게 갱신 */
  function syncUndoButton() {
    document.getElementById('btn-undo').disabled = !Board.canUndo();
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
    syncUndoButton();

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

  /**
   * 입력 문자열이 FEN인지 SAN(대수 기보)인지 판별한다.
   * FEN은 반드시 기물 배치 필드(대소문자 체스 기물·숫자·슬래시)로 시작한다.
   */
  function looksLikeFen(raw) {
    return /^[RNBQKPrnbqkp1-8]{1,8}\//.test(raw);
  }

  function onFenSubmit() {
    const input = document.getElementById('fen-input');
    const raw = input.value.trim();
    if (!raw) return;

    const ok = looksLikeFen(raw) ? Board.setPosition(raw) : Board.setMoves(raw);

    if (!ok) {
      alert(
        '유효하지 않은 입력입니다.\n\n' +
        'FEN 예시:\n  rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq\n\n' +
        '대수 기보 예시:\n  1.e4 e5 2.Nf3 Nc6 3.Bb5'
      );
      return;
    }

    input.value = '';
    loadMemoForCurrentFen();
    syncUndoButton();
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
   * iOS 인앱 브라우저(KakaoTalk, Instagram 등 WKWebView 기반) 여부를 판정한다.
   * 네이티브 Safari / iOS Chrome(CriOS)은 UA에 'Safari/'를 포함하지만
   * 대부분의 인앱 브라우저는 포함하지 않는다.
   */
  function isIOSInAppBrowser() {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isNativeBrowser = /Safari\//.test(ua) && !/KAKAOTALK|FBAN|FBAV/i.test(ua);
    return isIOS && !isNativeBrowser;
  }

  /**
   * JSON 문자열을 클립보드에 복사한다.
   * Clipboard API → execCommand 순으로 시도하며, 둘 다 실패하면 안내 메시지를 띄운다.
   */
  function copyJsonToClipboard(json) {
    const MSG_OK = 'JSON이 클립보드에 복사되었습니다.\n메모장 앱에 붙여넣기 후 .json 파일로 저장해 주세요.';
    const MSG_FAIL = '복사에 실패했습니다. 브라우저(Safari 등)에서 직접 접속해 주세요.';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json)
        .then(function () { alert(MSG_OK); })
        .catch(function () { legacyCopy(json, MSG_OK, MSG_FAIL); });
    } else {
      legacyCopy(json, MSG_OK, MSG_FAIL);
    }
  }

  /** document.execCommand('copy') — Clipboard API 미지원 구형 WebView용 폴백 */
  function legacyCopy(json, msgOk, msgFail) {
    const ta = document.createElement('textarea');
    ta.value = json;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      alert(document.execCommand('copy') ? msgOk : msgFail);
    } catch (e) {
      alert(msgFail);
    }
    document.body.removeChild(ta);
  }

  /**
   * blob URL + <a download> 방식으로 파일을 저장한다.
   * 데스크톱 Chrome/Firefox/Edge, Android Chrome에서 동작한다.
   * revokeObjectURL은 1초 뒤 호출해 일부 Android WebView에서
   * 다운로드 시작 전 URL이 해제되는 문제를 방지한다.
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

    // ① Web Share API (iOS 15+ 네이티브 Safari, Chrome Android 75+)
    const file = new File([json], 'memos.json', { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Chessor 메모' })
        .catch(function (err) {
          if (err.name !== 'AbortError') {
            isIOSInAppBrowser() ? copyJsonToClipboard(json) : blobDownload(json);
          }
        });
      return;
    }

    // ② iOS 인앱 브라우저(KakaoTalk 등): <a download>이 동작하지 않으므로 클립보드 복사
    if (isIOSInAppBrowser()) {
      copyJsonToClipboard(json);
      return;
    }

    // ③ 데스크톱 / Android: 직접 다운로드
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

    // FEN 붙여넣기로 포지션 이동
    document.getElementById('btn-fen-go').addEventListener('click', onFenSubmit);
    document.getElementById('fen-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') onFenSubmit();
    });

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
