(function () {
  'use strict';
  // Play Here Stream (Lab Tools): floating button that plays this box's
  // MPD HTTP stream (port 8000) in the current browser.
  // Not shown on the box's own touch display, which already plays through the soundcard.
  if (/^(localhost|127\.|\[?::1\]?$)/.test(location.hostname)) return;
  var STREAM = location.protocol + '//' + location.hostname + ':8000/';
  var audio = null, active = false, retryTimer = null;

  var btn = document.createElement('button');
  btn.id = 'labtools-playhere';
  btn.style.cssText = 'position:fixed;left:125px;bottom:148px;z-index:99999;' +
    'padding:8px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.35);' +
    'background:rgba(0,0,0,.65);color:#fff;font:14px sans-serif;cursor:pointer;';

  function setState(text, on) {
    btn.textContent = text;
    btn.style.background = on ? '#2e7d32' : 'rgba(0,0,0,.65)';
  }

  function teardown() {
    if (!audio) return;
    var a = audio;
    audio = null;               // detach first so its events are ignored
    a.pause();
    a.removeAttribute('src');
    a.load();                   // drops the HTTP connection
  }

  function onTrouble(e) {
    if (e.target !== audio || !active) return;
    teardown();
    setState('… Waiting for stream', true);
    clearTimeout(retryTimer);
    retryTimer = setTimeout(function () { if (active) start(); }, 3000);
  }

  function start() {
    active = true;
    audio = new Audio(STREAM);
    audio.addEventListener('playing', function (e) {
      if (e.target === audio) setState('■ Stop here', true);
    });
    audio.addEventListener('error', onTrouble);
    audio.addEventListener('ended', onTrouble);
    setState('… Connecting', true);
    var p = audio.play();
    if (p && p.catch) p.catch(function () { onTrouble({ target: audio }); });
  }

  function stop() {
    active = false;
    clearTimeout(retryTimer);
    teardown();
    setState('♪ Play here', false);
  }

  btn.onclick = function () { if (active) { stop(); } else { start(); } };
  setState('♪ Play here', false);

  if (document.body) { document.body.appendChild(btn); }
  else { document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(btn); }); }
})();
