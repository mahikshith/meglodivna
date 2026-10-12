export const PALETTE = Object.freeze({
  void: '#080f17', ink: '#0b1420', shadow: '#152432', steel: '#293c4b', mid: '#415565',
  light: '#708b99', snow: '#b8d3d9', white: '#e4f2ed', cyan: '#6de6ed', cyanDark: '#1e838f',
  amber: '#dda858', amberDark: '#87532d', red: '#e67559', rust: '#774a3c', fire: '#edb763',
});

// Draw at two-pixel resolution; the final nearest-neighbor copy keeps every edge crisp.
function painter(width, height) {
  const source = document.createElement('canvas');
  source.width = width / 2;
  source.height = height / 2;
  const c = source.getContext('2d', { willReadFrequently: true });
  const rect = (x, y, w, h, color) => {
    c.fillStyle = color;
    c.fillRect(Math.round(x / 2), Math.round(y / 2), Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
  };
  const poly = (points, color) => {
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(Math.round(x / 2), Math.round(y / 2)) : c.moveTo(Math.round(x / 2), Math.round(y / 2)));
    c.closePath();
    c.fill();
  };
  const line = (ax, ay, bx, by, width, color) => {
    if (![ax, ay, bx, by, width].every(Number.isFinite)) throw new Error('Invalid pixel line coordinates');
    let x = Math.round(ax / 2), y = Math.round(ay / 2);
    const x2 = Math.round(bx / 2), y2 = Math.round(by / 2);
    const dx = Math.abs(x2 - x), dy = -Math.abs(y2 - y), sx = x < x2 ? 1 : -1, sy = y < y2 ? 1 : -1;
    const size = Math.max(1, Math.round(width / 2));
    let error = dx + dy;
    c.fillStyle = color;
    for (;;) {
      c.fillRect(x - Math.floor(size / 2), y - Math.floor(size / 2), size, size);
      if (x === x2 && y === y2) break;
      const twice = error * 2;
      if (twice >= dy) { error += dy; x += sx; }
      if (twice <= dx) { error += dx; y += sy; }
    }
  };
  const ellipse = (cx, cy, rx, ry, color) => {
    for (let y = -ry; y <= ry; y += 2) {
      const reach = Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) * rx;
      rect(cx - reach, cy + y, reach * 2, 2, color);
    }
  };
  const finish = () => {
    const pixels = c.getImageData(0, 0, source.width, source.height);
    for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = pixels.data[i] >= 128 ? 255 : 0;
    c.putImageData(pixels, 0, 0);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.drawImage(source, 0, 0, width, height);
    return canvas;
  };
  return { rect, poly, line, ellipse, finish };
}

function courier(p, state, frame) {
  const { rect: r, poly: q, line: l } = p, C = PALETTE;
  const running = state === 'run', attacking = state === 'slash';
  const stride = running ? Math.sin(frame * Math.PI / 4) : 0;
  const lift = running ? (frame % 4 === 0 ? -2 : 0) : state === 'idle' && frame >= 2 ? -2 : 0;
  const airborne = state === 'jump' || state === 'fall';
  const hip = [31, 44 + lift], chest = [32, 29 + lift];
  const rearKnee = airborne ? state === 'jump' ? [22, 51] : [26, 54] : [29 - stride * 10, 55];
  const rearFoot = airborne ? state === 'jump' ? [16, 56] : [20, 64] : [28 - stride * 14, 66 - Math.max(0, stride) * 8];
  const knee = airborne ? state === 'jump' ? [38, 51] : [39, 52] : [34 + stride * 10, 56];
  const foot = airborne ? state === 'jump' ? [36, 64] : [43, 61] : [34 + stride * 15, 66 - Math.max(0, -stride) * 8];
  // Reused joint geometry keeps every pose anchored and the limbs anatomically consistent.
  const leg = (joint, end, back) => {
    l(...hip, ...joint, 10, C.ink); l(...joint, ...end, 8, C.ink);
    l(...hip, ...joint, 6, back ? C.shadow : C.steel);
    l(...joint, ...end, 6, back ? C.steel : C.mid);
    r(joint[0] - 4, joint[1] - 2, 8, 6, back ? C.steel : C.light);
    l(joint[0] + 2, joint[1] + 4, end[0] + 2, end[1] - 4, 2, back ? C.mid : C.snow);
    r(end[0] - 4, end[1] - 2, 12, 4, C.ink);
    r(end[0] - 2, end[1] - 4, 10, 4, back ? C.steel : C.mid);
    r(end[0] + 2, end[1] - 4, 6, 2, C.light);
  };
  leg(rearKnee, rearFoot, true);
  // Jetpack, rear arm and flowing scarf sit behind the shoulder plates.
  r(18, 27 + lift, 10, 19, C.ink); r(20, 29 + lift, 6, 14, C.steel);
  r(20, 30 + lift, 2, 9, C.light); r(18, 43 + lift, 6, 4, C.shadow);
  r(20, 44 + lift, 4, 2, C.cyanDark);
  const backElbow = running ? [25 - stride * 6, 39 + lift] : [23, 39 + lift];
  l(27, 31 + lift, ...backElbow, 8, C.ink); l(...backElbow, 26 - stride * 8, 44 + lift, 6, C.steel);
  const flap = airborne ? state === 'jump' ? 4 : -4 : running ? frame % 3 * 2 : frame % 2 * 2;
  q([[27, 24 + lift], [21, 25 + lift], [15, 22 + flap], [6, 27 + flap], [13, 31 + flap], [22, 29 + lift], [28, 28 + lift]], C.amberDark);
  q([[25, 24 + lift], [20, 24 + lift], [14, 24 + flap], [6, 27 + flap], [13, 28 + flap], [23, 27 + lift]], C.amber);
  r(10, 28 + flap, 4, 2, C.fire);
  leg(knee, foot, false);
  q([[25, 28 + lift], [36, 26 + lift], [41, 33 + lift], [37, 44 + lift], [26, 46 + lift], [22, 37 + lift]], C.ink);
  q([[27, 28 + lift], [36, 28 + lift], [38, 34 + lift], [34, 43 + lift], [27, 42 + lift], [24, 35 + lift]], C.steel);
  q([[28, 29 + lift], [35, 29 + lift], [36, 33 + lift], [29, 36 + lift], [25, 34 + lift]], C.mid);
  l(28, 29 + lift, 35, 28 + lift, 2, C.snow);
  r(28, 37 + lift, 7, 2, C.shadow); r(29, 40 + lift, 6, 2, C.light);
  r(24, 43 + lift, 14, 4, C.ink); r(29, 44 + lift, 4, 2, C.amber);
  r(33, 45 + lift, 6, 5, C.shadow); r(35, 45 + lift, 2, 4, C.mid);
  // Athletic helmet: small head, sloped visor, narrow neck and cheek guard.
  r(29, 22 + lift, 7, 8, C.shadow);
  q([[26, 12 + lift], [35, 11 + lift], [41, 16 + lift], [40, 23 + lift], [35, 27 + lift], [27, 23 + lift], [24, 17 + lift]], C.ink);
  q([[27, 14 + lift], [34, 13 + lift], [39, 17 + lift], [38, 22 + lift], [33, 24 + lift], [28, 21 + lift], [26, 17 + lift]], C.mid);
  r(28, 14 + lift, 6, 2, C.light);
  q([[32, 17 + lift], [42, 17 + lift], [39, 21 + lift], [32, 21 + lift]], C.shadow);
  l(33, 18 + lift, 40, 18 + lift, 2, C.cyan);
  r(30, 22 + lift, 8, 2, C.steel); r(26, 19 + lift, 3, 3, C.light);
  r(27, 25 + lift, 11, 4, C.amberDark); r(28, 25 + lift, 9, 2, C.amber);
  const elbow = attacking ? [[40, 33], [43, 29], [45, 35], [39, 41]][frame] : airborne ? [41, 32] : [40 - stride * 5, 38 + lift];
  const hand = attacking ? [[44, 23], [48, 31], [46, 44], [42, 46]][frame] : airborne ? [45, 39] : [43 - stride * 7, 43 + lift];
  l(36, 31 + lift, ...elbow, 8, C.ink); l(...elbow, ...hand, 6, C.ink);
  l(37, 31 + lift, ...elbow, 6, C.mid); l(...elbow, ...hand, 4, C.light);
  r(34, 29 + lift, 8, 6, C.light); r(36, 31 + lift, 6, 4, C.mid);
  r(hand[0] - 2, hand[1] - 2, 6, 6, C.shadow); r(hand[0], hand[1] - 2, 4, 2, C.snow);
  const tips = attacking ? [[55, 5], [62, 20], [62, 49], [57, 60]][frame] : [55 - stride * 7, 59 + lift];
  l(hand[0] - 2, hand[1] - 2, hand[0] + 3, hand[1] + 3, 6, C.shadow);
  l(...hand, ...tips, 6, C.cyanDark); l(...hand, ...tips, 2, C.white);
  r(tips[0] - 1, tips[1] - 1, 2, 2, C.cyan);
  if (attacking && frame === 1) {
    l(56, 7, 62, 16, 2, C.cyanDark); l(60, 10, 62, 19, 2, C.cyan);
  }
}

function guard(p, frame) {
  const { rect: r, poly: q, line: l } = p, C = PALETTE;
  const step = Math.sin(frame * Math.PI / 2) * 6;
  l(22, 33, 17 - step, 44, 10, C.ink); l(17 - step, 44, 16 - step, 51, 8, C.steel);
  r(12 - step, 50, 13, 4, C.ink); r(14 - step, 48, 10, 4, C.mid);
  r(13, 19, 8, 18, C.ink); r(14, 20, 4, 12, C.rust);
  l(26, 33, 28 + step, 43, 10, C.ink); l(28 + step, 43, 29 + step, 51, 8, C.mid);
  r(25 + step, 50, 13, 4, C.ink); r(27 + step, 48, 10, 4, C.light);
  r(23 + step, 40, 8, 5, C.light); r(24 + step, 43, 6, 2, C.steel);
  q([[18, 17], [29, 16], [34, 23], [31, 36], [19, 36], [15, 27]], C.ink);
  q([[20, 19], [28, 18], [31, 24], [28, 34], [20, 34], [17, 26]], C.rust);
  q([[20, 19], [28, 19], [30, 23], [22, 27], [18, 24]], '#a57356');
  r(19, 29, 10, 3, C.steel); r(21, 31, 3, 2, C.red); r(16, 22, 6, 7, C.mid);
  r(19, 6, 11, 14, C.ink); q([[20, 8], [27, 7], [32, 11], [31, 17], [23, 20], [19, 15]], C.mid);
  r(20, 8, 7, 2, C.light); r(24, 12, 9, 4, C.shadow); r(25, 12, 8, 2, C.red);
  r(22, 18, 8, 3, C.steel);
  l(29, 21, 34, 29, 8, C.ink); l(30, 22, 34, 28, 6, C.mid); l(34, 28, 38, 27, 6, C.light);
  r(29, 25, 17, 6, C.ink); r(31, 25, 13, 3, C.mid); r(41, 24, 5, 4, C.light);
  r(33, 29, 4, 6, C.shadow); r(32, 24, 6, 2, C.rust); r(44, 25, 3, 2, C.red);
}

function drone(p, frame) {
  const { rect: r, poly: q, line: l, ellipse: e } = p, C = PALETTE;
  l(10, 12, 18, 18, 6, C.ink); l(38, 18, 46, 12, 6, C.ink);
  r(2, 8, 19, 4, C.steel); r(35, 8, 19, 4, C.steel);
  r(2 + frame % 2 * 2, 6, 17, 2, C.light); r(37 - frame % 2 * 2, 6, 17, 2, C.light);
  r(8, 12, 10, 8, C.shadow); r(38, 12, 10, 8, C.shadow);
  r(10, 18, 6, 4, C.cyanDark); r(40, 18, 6, 4, C.cyanDark);
  r(12, 21, 2, 4 + frame % 2 * 2, C.cyan); r(42, 21, 2, 4 + (frame + 1) % 2 * 2, C.cyan);
  q([[18, 13], [34, 13], [41, 22], [35, 31], [21, 31], [14, 24]], C.ink);
  q([[19, 15], [33, 15], [38, 22], [32, 28], [22, 28], [17, 23]], C.steel);
  q([[21, 15], [32, 15], [35, 20], [26, 22], [19, 19]], C.light);
  r(20, 22, 16, 4, C.shadow); e(30, 22, 5, 4, C.red); r(29, 20, 3, 3, C.fire);
  l(22, 28, 19, 35, 4, C.mid); l(34, 28, 38, 34, 4, C.mid);
  r(24, 30, 10, 6, C.ink); r(26, 30, 6, 4, C.rust); r(28, 34, 6, 4, C.steel);
}

function turret(p) {
  const { rect: r, poly: q, line: l } = p, C = PALETTE;
  q([[12, 38], [40, 38], [48, 50], [46, 54], [6, 54], [6, 48]], C.ink);
  q([[13, 40], [38, 40], [44, 50], [10, 50]], C.steel);
  r(11, 50, 30, 2, C.light); r(15, 44, 22, 4, C.shadow);
  for (let x = 16; x < 37; x += 6) r(x, 45, 2, 3, C.rust);
  r(20, 30, 12, 12, C.ink); r(22, 31, 8, 10, C.mid);
  q([[12, 14], [40, 12], [49, 21], [43, 35], [16, 36], [8, 27]], C.ink);
  q([[14, 16], [39, 14], [46, 22], [41, 32], [17, 33], [11, 26]], C.rust);
  q([[15, 16], [38, 15], [42, 20], [20, 23], [12, 23]], '#9b6b52');
  r(24, 22, 28, 8, C.ink); r(26, 23, 27, 4, C.steel); r(45, 22, 9, 7, C.mid);
  r(50, 24, 5, 3, C.shadow); r(14, 27, 7, 3, C.red);
  l(18, 14, 20, 7, 2, C.mid); r(19, 5, 4, 3, C.red);
  r(17, 18, 5, 2, C.light); r(34, 30, 4, 2, C.amber);
}

function warden(p, frame) {
  const { rect: r, poly: q, line: l, ellipse: e } = p, C = PALETTE;
  const lift = frame % 2 * -2;
  const leg = (x, side) => {
    l(x, 90, x + side * 6, 113, 24, C.ink); l(x + side * 6, 113, x + side * 9, 132, 22, C.ink);
    l(x, 90, x + side * 6, 111, 18, C.steel); l(x + side * 6, 115, x + side * 9, 132, 16, C.mid);
    r(x + side * 6 - 10, 105, 20, 14, C.shadow); r(x + side * 6 - 8, 106, 16, 8, C.rust);
    l(x + side * 9 - 6, 119, x + side * 9 - 4, 130, 4, C.light);
    r(x + side * 9 - 12, 130, 30, 8, C.ink); r(x + side * 9 - 9, 130, 24, 4, C.steel);
    r(x + side * 9 - 6, 130, 14, 2, C.light);
  };
  leg(45, -1); leg(78, 1);
  r(18, 38 + lift, 20, 46, C.ink); r(20, 39 + lift, 12, 37, C.rust);
  r(22, 42 + lift, 6, 26, C.shadow); r(24, 44 + lift, 2, 18, C.red);
  r(32, 79 + lift, 56, 18, C.ink); r(38, 82 + lift, 44, 11, C.steel);
  for (let x = 41; x < 80; x += 12) r(x, 84 + lift, 6, 5, C.mid);
  q([[35, 35 + lift], [79, 31 + lift], [97, 49 + lift], [88, 78 + lift], [65, 88 + lift], [38, 77 + lift], [28, 52 + lift]], C.ink);
  q([[38, 38 + lift], [76, 35 + lift], [90, 49 + lift], [83, 74 + lift], [64, 82 + lift], [42, 74 + lift], [32, 53 + lift]], C.steel);
  q([[41, 39 + lift], [75, 36 + lift], [85, 46 + lift], [65, 53 + lift], [37, 49 + lift]], C.mid);
  l(41, 39 + lift, 76, 36 + lift, 2, C.snow);
  q([[42, 54 + lift], [78, 52 + lift], [81, 68 + lift], [65, 79 + lift], [44, 69 + lift]], C.shadow);
  e(62, 61 + lift, 15, 15, C.ink); e(62, 61 + lift, 12, 12, C.rust);
  e(62, 61 + lift, 8, 8, frame === 2 ? C.fire : C.red); e(62, 61 + lift, 4, 4, C.white);
  for (let y = 52; y < 72; y += 6) { r(39, y + lift, 6, 2, C.mid); r(81, y + lift, 6, 2, C.mid); }
  // Angular shoulder armor, heavy cannon and exposed piston read as an industrial weapon.
  q([[18, 33 + lift], [38, 29 + lift], [48, 43 + lift], [37, 57 + lift], [14, 53 + lift], [10, 40 + lift]], C.ink);
  q([[20, 35 + lift], [36, 33 + lift], [43, 42 + lift], [34, 51 + lift], [17, 48 + lift], [14, 41 + lift]], C.rust);
  l(19, 35 + lift, 36, 33 + lift, 2, C.amber);
  l(22, 52 + lift, 18, 71 + lift, 18, C.ink); l(22, 53 + lift, 18, 70 + lift, 12, C.mid);
  l(18, 70 + lift, 26, 94 + lift, 18, C.ink); l(18, 71 + lift, 25, 90 + lift, 12, C.steel);
  r(18, 88 + lift, 20, 20, C.ink); r(22, 90 + lift, 14, 14, C.mid); r(22, 94 + lift, 14, 2, C.light);
  q([[81, 30 + lift], [102, 32 + lift], [113, 44 + lift], [108, 60 + lift], [88, 59 + lift], [77, 43 + lift]], C.ink);
  q([[85, 34 + lift], [100, 36 + lift], [108, 44 + lift], [104, 54 + lift], [89, 54 + lift], [82, 43 + lift]], C.mid);
  l(86, 34 + lift, 100, 36 + lift, 2, C.light);
  l(101, 57 + lift, 99, 71 + lift, 16, C.ink); l(101, 57 + lift, 99, 69 + lift, 10, C.light);
  q([[90, 65 + lift], [118, 63 + lift], [124, 76 + lift], [120, 98 + lift], [90, 98 + lift], [84, 82 + lift]], C.ink);
  q([[93, 68 + lift], [117, 67 + lift], [120, 78 + lift], [116, 93 + lift], [94, 93 + lift], [88, 81 + lift]], C.steel);
  r(108, 72 + lift, 14, 20, C.shadow); r(116, 74 + lift, 8, 16, C.mid); r(119, 78 + lift, 6, 9, C.ink);
  for (let y = 73; y < 92; y += 6) r(92, y + lift, 10, 2, C.light);
  r(104, 67 + lift, 8, 2, C.red);
  r(48, 18 + lift, 25, 22, C.ink);
  q([[47, 17 + lift], [66, 11 + lift], [81, 20 + lift], [78, 32 + lift], [62, 40 + lift], [48, 30 + lift]], C.ink);
  q([[51, 19 + lift], [65, 15 + lift], [76, 21 + lift], [74, 29 + lift], [62, 35 + lift], [52, 28 + lift]], C.mid);
  l(52, 19 + lift, 65, 15 + lift, 2, C.light); r(54, 24 + lift, 23, 5, C.shadow);
  r(59, 24 + lift, 18, 2, C.red); r(72, 24 + lift, 4, 2, C.fire);
  r(59, 31 + lift, 12, 4, C.steel); r(62, 32 + lift, 2, 4, C.ink); r(67, 32 + lift, 2, 4, C.ink);
  l(47, 22 + lift, 43, 10 + lift, 4, C.steel); r(42, 8 + lift, 4, 4, C.red);
  r(99, 43 + lift, 6, 2, C.amber); r(101, 46 + lift, 4, 2, C.amber);
}

function steel(p, wall = false) {
  const { rect: r, poly: q, line: l } = p, C = PALETTE;
  r(0, 0, 64, 64, wall ? C.shadow : C.steel);
  r(2, 2, 60, 60, wall ? '#1c2c39' : '#334957');
  r(4, 4, 56, 2, C.mid); r(4, 58, 56, 2, C.ink); r(4, 6, 2, 50, C.steel);
  r(57, 6, 3, 51, C.shadow); r(9, 10, 46, 43, wall ? '#182733' : '#253944');
  if (wall) {
    for (let y = 14; y < 49; y += 8) { r(14, y, 38, 2, C.ink); r(14, y + 2, 38, 2, '#263947'); }
    r(13, 12, 2, 41, C.steel); r(53, 11, 2, 42, C.ink);
  } else {
    q([[10, 11], [53, 11], [53, 21], [40, 34], [23, 34], [10, 21]], C.steel);
    l(12, 13, 26, 29, 2, C.mid); l(50, 13, 37, 29, 2, C.mid);
    r(14, 41, 34, 4, C.shadow); r(14, 45, 34, 2, C.mid);
    for (let x = 18; x < 45; x += 8) r(x, 42, 2, 3, C.rust);
    r(10, 54, 8, 2, C.rust); r(12, 52, 2, 2, C.rust); r(41, 10, 8, 2, C.mid);
  }
  for (const [x, y] of [[6, 6], [56, 6], [6, 56], [56, 56]]) { r(x, y, 3, 3, C.ink); r(x, y, 2, 2, C.light); }
}

function snow(p) {
  const { rect: r, poly: q } = p, C = PALETTE;
  q([[0, 11], [8, 9], [14, 5], [24, 5], [31, 9], [43, 5], [56, 7], [64, 11], [64, 24], [0, 24]], C.light);
  q([[0, 9], [9, 7], [15, 3], [24, 3], [30, 7], [43, 3], [55, 5], [64, 9], [64, 16], [0, 16]], C.snow);
  q([[4, 9], [14, 5], [22, 5], [28, 9], [36, 8], [43, 5], [54, 7], [58, 10], [36, 12], [11, 12]], C.white);
  r(12, 14, 4, 12, C.snow); r(14, 24, 2, 4, C.light); r(44, 14, 4, 8, C.snow); r(46, 21, 2, 8, C.light);
  r(27, 13, 3, 6, C.snow); r(58, 14, 4, 10, C.snow);
}

function far(p) {
  const { rect: r, poly: q, line: l, ellipse: e } = p;
  for (let y = 0; y < 720; y += 20) {
    const t = y / 720;
    r(0, y, 960, 20, `rgb(${17 + Math.round(t * 36)},${29 + Math.round(t * 50)},${41 + Math.round(t * 45)})`);
  }
  e(771, 100, 33, 33, '#273d48'); e(775, 97, 28, 27, '#304753');
  r(757, 81, 8, 4, '#273d48'); r(781, 107, 10, 6, '#293f4b'); r(763, 114, 6, 2, '#293f4b');
  // Sparse ragged cloud banks add atmosphere without competing with moving projectiles.
  for (let i = 0; i < 34; i++) {
    const x = 80 + (i * 157 + 31) % 800, y = 106 + i % 5 * 22;
    e(x, y, 28 + i % 4 * 16, 4 + i % 3 * 2, i % 2 ? '#20323e' : '#1d303c');
  }
  // Opaque continuous sky at both tile edges, with low-contrast ridges in front.
  q([[0, 312], [64, 270], [111, 285], [177, 216], [220, 246], [271, 177], [311, 236], [362, 216], [427, 293], [503, 236], [557, 176], [588, 219], [637, 206], [711, 292], [758, 257], [814, 205], [861, 252], [922, 270], [960, 312], [960, 720], [0, 720]], '#293e49');
  q([[110, 284], [177, 216], [190, 246], [168, 241], [153, 264], [139, 259]], '#39515a');
  q([[227, 230], [271, 177], [311, 236], [289, 225], [271, 203], [254, 225], [245, 220]], '#49626a');
  q([[503, 236], [557, 176], [588, 219], [564, 210], [552, 197], [534, 221], [523, 216]], '#445e66');
  q([[781, 241], [814, 205], [861, 252], [839, 242], [816, 221], [803, 240]], '#3c5660');
  q([[271, 199], [289, 225], [293, 267], [281, 246], [283, 233]], '#233843');
  q([[557, 198], [564, 210], [576, 228], [581, 267], [569, 248], [566, 222]], '#293e4a');
  q([[177, 239], [193, 251], [213, 295], [197, 281], [186, 254]], '#223641');
  for (let i = 0; i < 50; i++) {
    const x = 198 + i * 3, y = 254 + (i * 19 % 32);
    r(x, y, 2 + i % 3 * 2, 2, i % 2 ? '#2b414c' : '#344b55');
    r(510 + i * 2, 250 + (i * 11 % 45), 2, 2, '#334b55');
  }
  q([[0, 374], [99, 329], [154, 348], [209, 303], [311, 380], [379, 342], [459, 365], [542, 316], [637, 368], [691, 331], [801, 378], [858, 340], [960, 374], [960, 720], [0, 720]], '#223541');
  for (let i = 0; i < 10; i++) {
    const x = i * 94 + 12, top = 403 - (i * 31 % 82), w = 44 + i % 3 * 10;
    r(x, top, w, 317, '#1c2d39'); r(x + 4, top + 3, w - 8, 3, '#344955');
    r(x + 12, top - 25, 8, 25, '#1c2d39'); r(x + 10, top - 25, 12, 3, '#344955');
    r(x + 4, top, w - 8, 2, '#405962'); r(x + 9, top + 2, 4, 4, '#364f59');
    for (let y = top + 22; y < 560; y += 32) for (let j = 0; j < 3; j++) r(x + 8 + j * 10, y, 4, 6, (i + j + y) % 4 ? '#2a424d' : '#596257');
  }
  for (let x = 0; x < 960; x += 120) {
    l(x, 514, x + 120, 462, 4, '#182b37'); l(x, 462, x + 120, 514, 4, '#182b37');
  }
  r(0, 458, 960, 6, '#243b46'); r(0, 512, 960, 8, '#172935');
  for (let x = 18; x < 960; x += 96) { r(x, 506, 2, 8, '#6c6557'); r(x + 2, 508, 4, 2, '#88735b'); }
  r(0, 572, 960, 148, '#172732');
  for (let i = 0; i < 40; i++) r((i * 167 + 37) % 956, (i * 53 + 41) % 290, 2, 2, '#54656b');
}

function mid(p) {
  const { rect: r, poly: q, line: l } = p;
  // Transparent foreground-free silhouettes preserve the actual level's jump surfaces.
  const dark = '#11212c', edge = '#253944', metal = '#1b2f3b';
  const tower = (x, top, width) => {
    r(x, top, width, 720 - top, dark); r(x + 4, top + 4, width - 8, 4, edge);
    r(x + 8, top + 8, 4, 710 - top, metal); r(x + width - 10, top + 8, 4, 710 - top, metal);
    for (let y = top + 42; y < 720; y += 52) {
      r(x + 12, y, width - 24, 4, edge); r(x + 12, y + 4, width - 24, 2, '#0b1b27');
      l(x + 16, y + 10, x + width - 18, y + 44, 2, metal);
      l(x + width - 18, y + 10, x + 16, y + 44, 2, metal);
    }
    for (let y = top + 26; y < 660; y += 104) r(x + 22, y, 8, 12, '#48615f');
  };
  tower(50, 348, 96); tower(664, 330, 122);
  tower(312, 455, 138); tower(851, 418, 60);
  r(79, 232, 24, 116, dark); r(81, 232, 4, 114, edge); r(76, 230, 30, 8, metal);
  r(717, 207, 22, 122, dark); r(719, 207, 4, 120, edge); r(713, 204, 30, 8, metal);
  r(98, 262, 17, 86, dark); r(103, 262, 4, 80, metal);
  r(65, 317, 96, 5, '#46606a'); r(57, 343, 93, 4, '#405863');
  r(676, 325, 100, 5, '#49646b');
  // Refinery pipes and gantry run beneath the mountain skyline.
  r(146, 400, 168, 12, dark); r(146, 400, 168, 3, edge);
  r(450, 468, 220, 12, dark); r(450, 468, 220, 3, edge);
  for (let x = 162; x < 308; x += 32) r(x, 394, 4, 22, metal);
  for (let x = 460; x < 660; x += 36) r(x, 462, 4, 24, metal);
  l(153, 421, 310, 447, 4, dark); l(454, 492, 656, 517, 4, dark);
  r(484, 590, 135, 130, dark); r(488, 592, 128, 4, edge);
  q([[483, 590], [503, 566], [588, 566], [618, 590]], metal);
  r(508, 568, 75, 3, '#3c535e');
  for (let x = 502; x < 606; x += 16) r(x, 610, 6, 24, '#253e46');
  for (let y = 638; y < 714; y += 18) r(498, y, 110, 3, metal);
  l(300, 440, 300, 353, 4, metal); l(286, 367, 314, 367, 2, edge); l(290, 354, 310, 354, 2, edge);
  r(298, 350, 4, 4, '#9d6552');
  // Tiles meet on an unbroken lower service wall, without a seam in the skyline.
  r(0, 696, 960, 24, dark); r(0, 696, 960, 2, edge);
}

function prop(p, name) {
  const { rect: r, poly: q, line: l, ellipse: e } = p, C = PALETTE;
  if (name === 'antenna') {
    r(28, 130, 27, 14, C.ink); r(30, 132, 23, 10, C.steel);
    l(40, 134, 40, 18, 6, C.ink); l(40, 132, 40, 18, 2, C.light);
    l(18, 132, 39, 64, 4, C.steel); l(62, 132, 41, 64, 4, C.steel);
    for (let y = 37; y < 110; y += 24) { l(40 - (y - 18) / 5, y, 40 + (y - 18) / 5, y, 2, C.mid); }
    l(22, 20, 58, 20, 4, C.mid); l(26, 29, 54, 29, 2, C.light);
    l(30, 39, 50, 39, 2, C.mid); r(38, 5, 4, 13, C.steel); r(36, 4, 8, 5, C.red);
    q([[41, 53], [63, 39], [70, 47], [60, 61], [46, 66]], C.shadow);
    l(46, 56, 63, 46, 2, C.light); r(61, 45, 3, 3, C.red);
    r(31, 134, 8, 2, C.rust);
  } else if (name === 'pipe') {
    r(8, 0, 24, 96, C.ink); r(10, 0, 20, 96, C.steel); r(12, 0, 4, 96, C.light); r(24, 0, 4, 96, C.shadow);
    for (let y = 8; y < 90; y += 28) { r(6, y, 28, 8, C.ink); r(8, y + 2, 24, 4, C.mid); r(10, y + 2, 3, 3, C.light); }
    q([[30, 22], [61, 22], [73, 34], [73, 96], [53, 96], [53, 43], [30, 43]], C.ink);
    q([[30, 24], [59, 24], [69, 36], [69, 96], [57, 96], [57, 41], [30, 41]], C.rust);
    l(31, 26, 59, 26, 2, C.amberDark); l(59, 28, 66, 36, 2, C.amberDark); r(58, 42, 3, 48, '#9d6a4f');
    r(49, 54, 26, 8, C.ink); r(52, 56, 21, 4, C.mid); r(54, 56, 3, 3, C.light);
    e(30, 55, 9, 10, C.ink); e(30, 55, 7, 8, C.rust); e(30, 55, 3, 4, C.mid);
    l(25, 50, 35, 60, 2, C.light); l(25, 60, 35, 50, 2, C.light);
  } else if (name === 'lamp') {
    r(14, 0, 4, 22, C.steel); r(10, 21, 12, 7, C.ink); r(6, 26, 20, 20, C.ink);
    r(8, 28, 16, 15, C.amberDark); r(10, 30, 12, 10, C.amber); r(12, 30, 8, 6, C.white);
    r(6, 44, 20, 4, C.mid); r(8, 45, 16, 2, C.light); r(8, 28, 2, 14, C.steel); r(22, 28, 2, 14, C.steel);
    r(5, 25, 22, 3, C.light); r(13, 46, 6, 14, C.shadow); r(11, 59, 10, 3, C.mid);
  } else {
    r(2, 5, 60, 58, C.ink); r(4, 7, 56, 54, C.rust); r(8, 11, 48, 45, C.steel);
    r(9, 12, 46, 2, C.light); q([[12, 15], [22, 15], [51, 46], [51, 52], [42, 52], [12, 23]], C.mid);
    q([[43, 15], [51, 15], [51, 25], [21, 52], [12, 52], [12, 45]], C.mid);
    r(27, 26, 11, 12, C.ink); r(29, 28, 7, 8, C.amberDark); r(30, 29, 5, 2, C.amber);
    for (const [x, y] of [[6, 9], [56, 9], [6, 56], [56, 56]]) { r(x, y, 3, 3, C.ink); r(x, y, 2, 2, C.light); }
    q([[2, 7], [11, 3], [31, 3], [40, 5], [55, 3], [62, 7], [60, 10], [4, 10]], C.snow);
    r(10, 4, 19, 2, C.white); r(14, 9, 4, 7, C.snow);
  }
}

export function createArtTextures(scene) {
  const manifest = [];
  const add = (key, width, height, anchor, notes, draw) => {
    if (!scene.textures.exists(key)) {
      const p = painter(width, height);
      draw(p);
      const canvas = p.finish();
      if (canvas.width !== width || canvas.height !== height) throw new Error(`Invalid art dimensions: ${key}`);
      scene.textures.addCanvas(key, canvas);
    }
    manifest.push({ key, width, height, anchor: { x: anchor[0], y: anchor[1] }, notes });
  };
  for (const [state, count] of [['idle', 4], ['run', 8], ['jump', 1], ['fall', 1], ['slash', 4]]) {
    for (let frame = 0; frame < count; frame++) add(`player-${state}-${frame}`, 64, 72, [32, 68], 'Courier faces right. Feet anchor; flipX to face left. Visible blade is separate from the hurt collider.', p => courier(p, state, frame));
  }
  for (let i = 0; i < 4; i++) add(`guard-${i}`, 48, 56, [24, 54], 'Right-facing rifle guard; walking cycle, plated human-scale silhouette.', p => guard(p, i));
  for (let i = 0; i < 4; i++) add(`drone-${i}`, 56, 40, [28, 20], 'Centered hovering drone; rotor/exhaust cycle, red targeting lens.', p => drone(p, i));
  add('turret-0', 56, 56, [28, 54], 'Right-facing stationary missile turret; feet anchor.', turret);
  for (let i = 0; i < 4; i++) add(`boss-${i}`, 128, 144, [64, 138], 'Warden faces right; industrial armor, core pulse and piston breathing cycle.', p => warden(p, i));
  add('tile-steel', 64, 64, [0, 0], 'Solid riveted steel surface. Collider must come from LEVEL.', p => steel(p));
  add('tile-wall', 64, 64, [0, 0], 'Dark vent wall; background or solid geometry decided by LEVEL.', p => steel(p, true));
  add('tile-snow', 64, 32, [0, 16], 'Transparent snowy ledge trim, decorative icicles; never adds collision.', snow);
  add('background-far', 960, 720, [0, 0], 'Opaque cold sky, snow mountain ridges and remote city. Horizontal edge colors match.', far);
  add('background-mid', 960, 720, [0, 0], 'Transparent refinery, pipes and gantries. Place behind terrain with parallax.', mid);
  for (const [key, w, h] of [['antenna', 80, 144], ['pipe', 80, 96], ['lamp', 32, 64], ['crate', 64, 64]]) add(key, w, h, [w / 2, h], 'Decoration only; do not add unintended player collision.', p => prop(p, key));
  if (manifest.length !== 40 || new Set(manifest.map(item => item.key)).size !== 40) throw new Error('Incomplete texture manifest');
  return manifest;
}
