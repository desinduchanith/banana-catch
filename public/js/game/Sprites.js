const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

function makeCanvas(size) {
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.ceil(size * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { canvas, ctx, size };
}

function emoji(char, size, tint = null) {
  const pad = size * 0.15;
  const s = makeCanvas(size + pad * 2);
  s.ctx.textAlign = 'center';
  s.ctx.textBaseline = 'middle';
  s.ctx.font = `${size}px ${EMOJI_FONT}`;
  s.ctx.fillText(char, s.size / 2, s.size / 2 + size * 0.06);
  if (tint) {
    s.ctx.globalCompositeOperation = 'source-atop';
    s.ctx.fillStyle = tint;
    s.ctx.fillRect(0, 0, s.size, s.size);
  }
  return s;
}

function rotten(size) {
  const s = emoji('🍌', size, 'rgba(74, 48, 14, 0.62)');
  s.ctx.globalCompositeOperation = 'source-atop';
  s.ctx.fillStyle = 'rgba(25, 15, 5, 0.75)';
  for (const [x, y, r] of [[0.38, 0.42, 0.06], [0.55, 0.55, 0.08], [0.62, 0.36, 0.05], [0.45, 0.66, 0.05]]) {
    s.ctx.beginPath();
    s.ctx.arc(s.size * x, s.size * y, s.size * r, 0, Math.PI * 2);
    s.ctx.fill();
  }
  return s;
}

function mysteryBox(size) {
  const s = makeCanvas(size * 1.2);
  const { ctx } = s;
  const o = (s.size - size) / 2;
  const grad = ctx.createLinearGradient(0, o, 0, o + size);
  grad.addColorStop(0, '#b794f6');
  grad.addColorStop(1, '#6b46c1');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#ede4ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(o, o, size, size, size * 0.18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(o + size * 0.44, o, size * 0.12, size);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${size * 0.62}px Fredoka, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = 4;
  ctx.fillText('?', s.size / 2, s.size / 2 + size * 0.04);
  return s;
}

export function buildSprites() {
  return {
    banana: emoji('🍌', 44),
    rotten: rotten(44),
    box: mysteryBox(44),
    basket: emoji('🧺', 70),
    mascot: emoji('🐵', 44),
  };
}
