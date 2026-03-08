/**
 * memo.js — FEN 기반 메모 데이터 관리 모듈
 * memoData 구조: { [fen: string]: { text: string, quality: 'good' | 'bad' } }
 * 기존 memos.json 포맷과 완전히 호환
 * localStorage 키: 'chessor_memos'
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'chessor_memos';

  /** @type {Object.<string, { text: string, quality: string }>} */
  let memoData = {};

  /** memoData를 localStorage에 저장한다 */
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoData));
    } catch (e) {
      // 저장 공간 부족 등 예외 상황 무시
    }
  }

  /**
   * localStorage에서 memoData를 복원한다. 앱 시작 시 1회 호출.
   */
  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          load(parsed);
          return;
        }
      }
    } catch (e) {
      // 손상된 데이터는 무시하고 빈 상태로 시작
    }
    memoData = {};
  }

  /**
   * 외부 JSON 데이터를 memoData로 불러온다.
   * @param {Object} data - 파싱된 JSON 객체
   */
  function load(data) {
    if (!data || typeof data !== 'object') return;
    // 구형 포맷(값이 string) 호환 처리
    memoData = {};
    for (const [fen, val] of Object.entries(data)) {
      if (typeof val === 'string') {
        memoData[fen] = { text: val, quality: 'good' };
      } else {
        memoData[fen] = {
          text: val.text || '',
          quality: val.quality === 'bad' ? 'bad' : 'good',
        };
      }
    }
    persist();
  }

  /**
   * 특정 FEN의 메모 항목을 반환한다. 없으면 빈 항목 반환.
   * @param {string} fen
   * @returns {{ text: string, quality: string }}
   */
  function get(fen) {
    return memoData[fen]
      ? { ...memoData[fen] }
      : { text: '', quality: 'good' };
  }

  /**
   * 특정 FEN의 메모를 저장/갱신한다.
   * @param {string} fen
   * @param {string} text
   * @param {string} quality - 'good' | 'bad'
   */
  function set(fen, text, quality) {
    memoData[fen] = {
      text: text || '',
      quality: quality === 'bad' ? 'bad' : 'good',
    };
    persist();
  }

  /**
   * 해당 FEN에 비어있지 않은 메모가 존재하는지 확인한다.
   * @param {string} fen
   * @returns {boolean}
   */
  function hasMemo(fen) {
    const entry = memoData[fen];
    return !!(entry && entry.text && entry.text.trim().length > 0);
  }

  /**
   * memoData를 pretty-printed JSON 문자열로 직렬화한다.
   * @returns {string}
   */
  function exportJSON() {
    return JSON.stringify(memoData, null, 2);
  }

  window.Memo = { init, load, get, set, hasMemo, exportJSON };
})();
