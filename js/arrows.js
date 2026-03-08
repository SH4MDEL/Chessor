/**
 * arrows.js — Canvas 오버레이 화살표 렌더링 모듈
 * 정수: 초록(#22c55e), 악수: 빨강(#ef4444), 반투명
 */
(function () {
  'use strict';

  /**
   * 체스 좌표(예: 'e4')를 캔버스 픽셀 좌표(중앙)로 변환
   * @param {string} square - 'a1' ~ 'h8'
   * @param {number} boardSize - 보드 전체 픽셀 크기
   * @param {string} orientation - 'white' | 'black'
   * @returns {{ x: number, y: number }}
   */
  function squareToPixel(square, boardSize, orientation) {
    const sqSize = boardSize / 8;
    const fileIdx = square.charCodeAt(0) - 97; // 'a'=0 … 'h'=7
    const rankIdx = parseInt(square[1], 10) - 1; // '1'=0 … '8'=7

    let col, row;
    if (orientation === 'white') {
      col = fileIdx;
      row = 7 - rankIdx;
    } else {
      col = 7 - fileIdx;
      row = rankIdx;
    }

    return {
      x: col * sqSize + sqSize / 2,
      y: row * sqSize + sqSize / 2,
    };
  }

  /**
   * canvas 2d 컨텍스트에 하나의 화살표를 그린다.
   */
  function drawArrow(ctx, from, to, hexColor, sqSize) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;

    const ux = dx / len;
    const uy = dy / len;

    const thickness = Math.max(6, sqSize * 0.14);
    const headLen = sqSize * 0.38;
    const inset = sqSize * 0.18; // 끝점을 안쪽으로 당겨 짤림 방지

    const endX = to.x - ux * inset;
    const endY = to.y - uy * inset;

    // 시작점도 약간 안쪽으로 (소스 기물 아이콘과 겹치는 부분 줄이기)
    const startInset = sqSize * 0.22;
    const startX = from.x + ux * startInset;
    const startY = from.y + uy * startInset;

    const wingAngle = (5 * Math.PI) / 6; // 150°
    const cos1 = Math.cos(wingAngle);
    const sin1 = Math.sin(wingAngle);
    const cos2 = Math.cos(-wingAngle);
    const sin2 = Math.sin(-wingAngle);
    const w1x = ux * cos1 - uy * sin1;
    const w1y = ux * sin1 + uy * cos1;
    const w2x = ux * cos2 - uy * sin2;
    const w2y = ux * sin2 + uy * cos2;

    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = hexColor;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 몸통 선
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // 화살촉 두 날개
    ctx.lineWidth = thickness * 0.9;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX + w1x * headLen, endY + w1y * headLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX + w2x * headLen, endY + w2y * headLen);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 화살표 목록을 canvas에 렌더링한다.
   * @param {HTMLCanvasElement} canvas
   * @param {Array<{ from: string, to: string, quality: string }>} arrows
   * @param {number} boardSize
   * @param {string} orientation - 'white' | 'black'
   */
  function draw(canvas, arrows, boardSize, orientation) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!arrows || arrows.length === 0) return;

    const sqSize = boardSize / 8;

    for (const arrow of arrows) {
      const from = squareToPixel(arrow.from, boardSize, orientation);
      const to = squareToPixel(arrow.to, boardSize, orientation);
      const color = arrow.quality === 'bad' ? '#ef4444' : '#22c55e';
      drawArrow(ctx, from, to, color, sqSize);
    }
  }

  window.Arrows = { draw };
})();
