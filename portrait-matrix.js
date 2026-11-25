// Matrix rain portrait — full-screen splash intro that auto-transitions to code wall
(function () {
  "use strict";

  const canvas = document.getElementById("portrait-matrix");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // --- Rendering config ---
  const CHARS = "01アイウエオカキクサシスセタチツテナニネノハヒフマミムメラリルレロヲン";
  const FPS = 28;
  const FRAME_MS = 1000 / FPS;
  const THRESHOLD = 0.07; // skip near-black (background) pixels

  // --- Splash dismiss logic ---
  const SPLASH_HOLD_MS = 1200;  // wait before auto-dismiss (after animation reveals portrait)
  const SPLASH_TOTAL_MS = 4200; // total time before auto-dismiss
  let dismissed = false;

  function dismissSplash() {
    if (dismissed) return;
    dismissed = true;
    const splash = document.getElementById("splash");
    if (!splash) return;
    splash.classList.add("is-leaving");
    setTimeout(() => { splash.style.display = "none"; }, 1200);
  }

  // Auto-dismiss and keyboard/click skip
  setTimeout(dismissSplash, SPLASH_TOTAL_MS);
  document.addEventListener("keydown", dismissSplash, { once: true });
  document.addEventListener("pointerdown", dismissSplash, { once: true });

  // --- Canvas setup: read CSS-driven width, enforce 3:4 portrait ratio ---
  // Allow one frame for CSS to apply before reading offsetWidth
  requestAnimationFrame(function setup() {
    const W = canvas.offsetWidth || 240;
    const H = Math.round(W * (4 / 3));
    canvas.width  = W;
    canvas.height = H;
    canvas.style.height = H + "px";

    // Cell size: scales with canvas so detail stays consistent
    const CELL = Math.max(8, Math.round(W / 28));
    const COLS = Math.floor(W / CELL);
    const ROWS = Math.floor(H / CELL);

    function randChar() {
      return CHARS[Math.floor(Math.random() * CHARS.length)];
    }

    const img = new Image();
    img.src = "assets/shannu.jpg";

    img.onload = function () {
      // Sample photo brightness into COLS×ROWS grid (cover-crop, centre-aligned)
      const off = document.createElement("canvas");
      off.width  = COLS;
      off.height = ROWS;
      const oc = off.getContext("2d");

      const iA = img.width  / img.height;
      const gA = COLS / ROWS;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (iA > gA) { sw = img.height * gA; sx = (img.width  - sw) / 2; }
      else          { sh = img.width  / gA; sy = (img.height - sh) / 2; }
      oc.drawImage(img, sx, sy, sw, sh, 0, 0, COLS, ROWS);

      const px  = oc.getImageData(0, 0, COLS, ROWS).data;
      const brt = new Float32Array(COLS * ROWS);
      for (let i = 0; i < COLS * ROWS; i++) {
        brt[i] = (0.299 * px[i*4] + 0.587 * px[i*4+1] + 0.114 * px[i*4+2]) / 255;
      }

      // Per-cell character + independent blink timer
      const cellCh   = Array.from({ length: COLS * ROWS }, randChar);
      const cellTick = Float32Array.from({ length: COLS * ROWS }, () => Math.random() * 25);

      // Rain drops — one per column, staggered start
      const drops = Array.from({ length: COLS }, () => ({
        y:     -Math.random() * ROWS * 1.6,
        speed:  0.22 + Math.random() * 0.4,
      }));

      ctx.font = `bold ${CELL}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.textBaseline = "top";

      let last = 0;
      let startTs = null;

      function frame(ts) {
        if (!startTs) startTs = ts;
        if (ts - last < FRAME_MS) { requestAnimationFrame(frame); return; }
        last = ts;

        ctx.clearRect(0, 0, W, H);

        // Global reveal progress: first SPLASH_HOLD_MS ms the portrait "assembles"
        const elapsed   = ts - startTs;
        const revealFrac = Math.min(elapsed / SPLASH_HOLD_MS, 1); // 0 → 1 over first second

        for (let x = 0; x < COLS; x++) {
          const drop = drops[x];
          drop.y += drop.speed;
          if (drop.y > ROWS + 12) {
            drop.y     = -Math.random() * ROWS * 0.6;
            drop.speed =  0.22 + Math.random() * 0.4;
          }

          for (let y = 0; y < ROWS; y++) {
            const idx = y * COLS + x;
            const b   = brt[idx];
            if (b < THRESHOLD) continue;

            // Update blinking char
            cellTick[idx]--;
            if (cellTick[idx] <= 0) {
              cellCh[idx]   = randChar();
              cellTick[idx] = 9 + Math.random() * 22;
            }

            const dist = drop.y - y;
            let alpha;

            if (dist >= 0 && dist < 1) {
              // Rain head — full white flash
              alpha = 1.0;
            } else if (dist >= 1 && dist < 10) {
              // Fading trail
              alpha = (1 - (dist - 1) / 9) * 0.9 * Math.min(b * 2, 1);
            } else {
              // Ambient: brightness-mapped glow, boosted during initial reveal
              const baseGlow = b * (0.3 + revealFrac * 0.35);
              alpha = baseGlow + (Math.random() < 0.025 ? 0.25 : 0);
            }

            alpha = Math.max(0, Math.min(1, alpha));
            if (alpha < 0.04) continue;

            ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
            ctx.fillText(cellCh[idx], x * CELL, y * CELL);
          }
        }

        requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    };
  });
})();
