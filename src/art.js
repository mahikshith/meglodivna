export const PALETTE = Object.freeze({
  void: '#080f17', ink: '#0b1420', shadow: '#152432', steel: '#293c4b', mid: '#415565',
  light: '#708b99', snow: '#b8d3d9', white: '#e4f2ed', cyan: '#6de6ed', cyanDark: '#1e838f',
  amber: '#dda858', amberDark: '#87532d', red: '#e67559', rust: '#774a3c', fire: '#edb763',
  copper: '#d99372', ivory: '#f0dfbc', violet: '#b08bed', crimson: '#c34065', electric: '#b9ed7b',
});

// Characters use single-pixel detail; scenery retains the cheaper two-pixel cluster grid.
function painter(width, height, unit = 2) {
  const source = document.createElement('canvas');
  source.width = width / unit;
  source.height = height / unit;
  const c = source.getContext('2d', { willReadFrequently: true });
  const rect = (x, y, w, h, color) => {
    c.fillStyle = color;
    c.fillRect(Math.round(x / unit), Math.round(y / unit), Math.max(1, Math.round(w / unit)), Math.max(1, Math.round(h / unit)));
  };
  const poly = (points, color) => {
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(Math.round(x / unit), Math.round(y / unit)) : c.moveTo(Math.round(x / unit), Math.round(y / unit)));
    c.closePath();
    c.fill();
  };
  const line = (ax, ay, bx, by, width, color) => {
    if (![ax, ay, bx, by, width].every(Number.isFinite)) throw new Error('Invalid pixel line coordinates');
    let x = Math.round(ax / unit), y = Math.round(ay / unit);
    const x2 = Math.round(bx / unit), y2 = Math.round(by / unit);
    const dx = Math.abs(x2 - x), dy = -Math.abs(y2 - y), sx = x < x2 ? 1 : -1, sy = y < y2 ? 1 : -1;
    const size = Math.max(1, Math.round(width / unit));
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
    for (let y = -ry; y <= ry; y += unit) {
      const reach = Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) * rx;
      rect(cx - reach, cy + y, reach * 2, unit, color);
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
  const running = state === 'run', attacking = ['slash','horizontal','finisher','lunge'].includes(state);
  const stride = state==='lunge' ? .85 : running ? Math.sin(frame * Math.PI / 4) : 0;
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
  const elbow = state==='lunge' ? [43,32] : state==='horizontal' ? [[35,29],[44,29],[45,36],[39,39]][frame] : attacking ? [[40, 33], [43, 29], [45, 35], [39, 41]][frame] : state==='shoot' ? [35,34] : airborne ? [41, 32] : [40 - stride * 5, 38 + lift];
  const hand = state==='lunge' ? [51,34] : state==='horizontal' ? [[39,27],[49,30],[49,38],[42,43]][frame] : attacking ? [[44, 23], [48, 31], [46, 44], [42, 46]][frame] : state==='shoot' ? [37,41] : airborne ? [45, 39] : [43 - stride * 7, 43 + lift];
  l(36, 31 + lift, ...elbow, 8, C.ink); l(...elbow, ...hand, 6, C.ink);
  l(37, 31 + lift, ...elbow, 6, C.mid); l(...elbow, ...hand, 4, C.light);
  r(34, 29 + lift, 8, 6, C.light); r(36, 31 + lift, 6, 4, C.mid);
  r(hand[0] - 2, hand[1] - 2, 6, 6, C.shadow); r(hand[0], hand[1] - 2, 4, 2, C.snow);
  if(state==='shoot')return;
  const tips = state==='lunge' ? [94,33+frame%2] : state==='horizontal' ? [[20,-15],[90,9],[94,38],[72,55]][frame] : state==='finisher' ? [[24,-62],[91,-21],[90,62],[65,70]][frame] : attacking ? [[35, -63], [90, -22], [88, 49], [49, 68]][frame] : [55 - stride * 7, 59 + lift];
  l(hand[0] - 2, hand[1] - 2, hand[0] + 3, hand[1] + 3, 6, C.shadow);
  l(...hand, ...tips, 6, C.cyanDark); l(...hand, ...tips, 2, C.white);
  r(tips[0] - 1, tips[1] - 1, 2, 2, C.cyan);
  if (state==='slash' && frame === 1) {
    l(72, -39, 92, -25, 2, C.cyanDark); l(78, -40, 94, -27, 2, C.cyan);
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

function warden(p, frame, state='idle') {
  const { rect: r, poly: q, line: l, ellipse: e } = p, C = PALETTE;
  const lift = frame % 2 * -2;
  const stride=state==='run'?Math.sin(frame*Math.PI/2)*9:0;
  const leg = (x, side) => {
    const travel=side*stride;
    l(x, 90, x + side * 6+travel/2, 113, 24, C.ink); l(x + side * 6+travel/2, 113, x + side * 9+travel, 132, 22, C.ink);
    l(x, 90, x + side * 6+travel/2, 111, 18, C.steel); l(x + side * 6+travel/2, 115, x + side * 9+travel, 132, 16, C.mid);
    r(x + side * 6 - 10, 105, 20, 14, C.shadow); r(x + side * 6 - 8, 106, 16, 8, C.rust);
    l(x + side * 9 - 6, 119, x + side * 9 - 4, 130, 4, C.light);
    r(x + side * 9 - 12+travel, 130, 30, 8, C.ink); r(x + side * 9 - 9+travel, 130, 24, 4, C.steel);
    r(x + side * 9 - 6+travel, 130, 14, 2, C.light);
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
  const recoil=state==='attack'&&frame%2?-4:0;
  q([[90+recoil,39],[117+recoil,37],[125+recoil,47],[124+recoil,66],[94+recoil,67],[84+recoil,54]],C.ink);
  q([[93+recoil,42],[115+recoil,40],[121+recoil,47],[120+recoil,62],[95+recoil,63],[88+recoil,54]],C.steel);
  r(108+recoil,44,16,18,C.shadow);r(116+recoil,45,10,16,C.mid);r(121+recoil,48,6,8,C.ink);
  for(let y=45;y<63;y+=5)r(92+recoil,y,10,2,C.light);
  r(104+recoil,40,8,2,C.red);
  r(48, 18 + lift, 25, 22, C.ink);
  q([[47, 17 + lift], [66, 11 + lift], [81, 20 + lift], [78, 32 + lift], [62, 40 + lift], [48, 30 + lift]], C.ink);
  q([[51, 19 + lift], [65, 15 + lift], [76, 21 + lift], [74, 29 + lift], [62, 35 + lift], [52, 28 + lift]], C.mid);
  l(52, 19 + lift, 65, 15 + lift, 2, C.light); r(54, 24 + lift, 23, 5, C.shadow);
  r(59, 24 + lift, 18, 2, C.red); r(72, 24 + lift, 4, 2, C.fire);
  r(59, 31 + lift, 12, 4, C.steel); r(62, 32 + lift, 2, 4, C.ink); r(67, 32 + lift, 2, 4, C.ink);
  l(47, 22 + lift, 43, 10 + lift, 4, C.steel); r(42, 8 + lift, 4, 4, C.red);
  r(99, 43 + lift, 6, 2, C.amber); r(101, 46 + lift, 4, 2, C.amber);
  if(state==='attack'){r(69,24+lift,7,3,C.fire);r(60,60,5,5,C.white);}
  if(state==='hurt'){l(49,41,60,49,2,C.red);l(71,74,80,62,2,C.red);r(52,26+lift,13,2,C.crimson);}
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

function translated(p, x, y, scale = 1) {
  return {
    rect: (a,b,w,h,c) => p.rect(x+a*scale,y+b*scale,w*scale,h*scale,c),
    poly: (points,c) => p.poly(points.map(([a,b]) => [x+a*scale,y+b*scale]),c),
    line: (a,b,d,e,w,c) => p.line(x+a*scale,y+b*scale,x+d*scale,y+e*scale,w*scale,c),
    ellipse: (a,b,w,h,c) => p.ellipse(x+a*scale,y+b*scale,w*scale,h*scale,c),
  };
}

function sorcerer(p, type, frame) {
  const { rect:r,poly:q,line:l,ellipse:e }=p,C=PALETTE, bob=frame%2*2;
  if(type==='sentinel') {
    guard(translated(p,8,20),frame);
    q([[17,40],[22,32],[34,35],[39,47],[36,61],[20,60]],C.ink);
    q([[19,41],[24,35],[33,37],[36,47],[32,57],[22,56]],C.ivory);
    r(24,41,8,12,C.steel);r(26,42,4,8,C.electric);r(27,42,2,4,C.white);
    q([[18,28],[23,25],[29,29],[27,37],[18,36]],C.light);q([[33,29],[38,25],[45,29],[43,36],[34,37]],C.light);
    l(25,28,19,17,4,C.ink);l(25,28,19,17,2,C.ivory);l(35,28,42,16,4,C.ink);l(35,28,42,16,2,C.ivory);
    r(18,14,4,6,C.electric);r(41,12,4,7,C.electric);r(31,27,10,2,C.electric);
    l(44,47,55,35,6,C.shadow);l(55,35,55,17,4,C.steel);r(52,16,7,4,C.electric);
    if(frame%2)l(53,8,59,16,2,C.electric);
    return;
  }
  const shade=type==='shade', cloth=shade?'#252740':'#493756',edge=shade?C.violet:C.crimson;
  l(29,52,23,65,8,C.ink);l(23,65,17,73,6,C.mid);r(13,72,11,4,C.ink);
  l(35,52,42,65,8,C.ink);l(42,65,42,73,6,C.steel);r(38,72,13,4,C.ink);
  q([[24,26+bob],[38,23+bob],[46,42],[42,56],[48,71],[37,69],[31,57],[24,70],[13,69],[18,49],[17,37]],C.ink);
  q([[25,29+bob],[37,27+bob],[41,39],[36,55],[42,65],[33,63],[29,50],[22,65],[17,64],[23,47],[20,36]],cloth);
  l(24,31+bob,22,50,2,edge);l(36,29+bob,38,47,2,C.mid);
  r(24,46,16,5,C.ink);r(29,47,6,3,C.copper);
  q([[22,15+bob],[33,9+bob],[43,17+bob],[43,28+bob],[30,35+bob],[21,27+bob]],C.ink);
  q([[24,16+bob],[33,12+bob],[39,18+bob],[38,26+bob],[30,31+bob],[24,26+bob]],cloth);
  q([[27,20+bob],[37,19+bob],[38,26+bob],[29,29+bob],[25,24+bob]],C.void);
  r(29,22+bob,9,2,shade?C.violet:C.fire);l(26,16+bob,32,13+bob,2,edge);
  l(21,32,14,44,8,C.ink);l(21,32,14,44,4,cloth);l(14,44,10,38,4,C.light);
  l(39,33,49,43,8,C.ink);l(40,33,49,43,4,cloth);r(46,41,7,4,C.ivory);
  if(shade){
    l(50,43,61,21,6,C.ink);l(50,43,61,21,2,C.ivory);l(51,43,62,27,2,C.violet);
    l(10,38,5,19,4,C.ink);l(10,38,5,19,2,C.violet);
    q([[23,26],[17,19],[5,26],[7,33],[15,29],[24,30]],C.shadow);
  }else{
    l(51,67,51,16,6,C.ink);l(51,67,51,16,2,C.copper);
    q([[44,17],[48,9],[46,3],[53,7],[58,3],[57,12],[61,18],[53,25]],C.ink);
    q([[47,16],[51,10],[54,12],[57,17],[53,21]],C.crimson);e(53,16,3,4,C.fire);
    r(8,34-frame%3*2,4,6,C.crimson);r(9,32-frame%3*2,2,4,C.fire);
    for(let y=36;y<65;y+=8)r(29,y,3,3,C.copper);
  }
}

function darkBoss(p, type, frame, state='idle') {
  const {rect:r,poly:q,line:l,ellipse:e}=p,C=PALETTE,bob=frame%2*2,hex=type==='hex';
  const robe=hex?'#4a243f':'#1a253d', trim=hex?C.crimson:C.violet,light=hex?C.copper:C.ivory;
  // Wide jagged mantles and long skeletal arms distinguish the sorcerous tyrants.
  q([[78,43+bob],[44,51],[23,39],[12,56],[3,100],[23,83],[21,139],[41,123],[44,165],[65,155],[79,181],[98,163],[116,178],[119,137],[139,157],[133,112],[158,128],[148,75],[129,53],[113,49]],C.ink);
  q([[76,49+bob],[48,56],[28,51],[19,72],[11,92],[33,76],[28,128],[45,106],[50,150],[65,139],[78,169],[96,146],[111,163],[110,117],[134,137],[124,94],[147,113],[138,79],[121,63],[108,55]],robe);
  for(let i=0;i<8;i++)l(48+i*8,66,34+i*13,154+(i%3)*8,2,i%2?trim:C.shadow);
  q([[59,57],[100,55],[118,77],[109,116],[86,134],[60,116],[48,83]],C.void);
  q([[61,60],[98,59],[112,79],[104,111],[86,126],[64,109],[55,83]],robe);
  l(62,63,73,89,4,light);l(99,62,89,89,4,light);
  const coreY=hex?106:98;
  e(80,coreY,17,20,C.ink);e(80,coreY,13,16,trim);e(80,coreY,8,11,state==='attack'?C.ivory:hex?C.red:C.cyanDark);e(80,coreY,4,7,C.white);
  for(let y=105;y<141;y+=8)r(78,y,9,3,light);
  l(49,66,30,93,14,C.ink);l(49,66,30,93,8,light);l(30,93,17,116-bob,12,C.ink);l(30,93,17,116-bob,6,C.mid);
  l(114,66,130,94,14,C.ink);l(114,66,130,94,8,light);l(130,94,145,114-bob,12,C.ink);l(130,94,145,114-bob,6,C.mid);
  for(let i=0;i<3;i++){l(17+i*3,116,12+i*4,130,2,light);l(143+i*3,114,142+i*4,130,2,light);}
  q([[60,17+bob],[80,7+bob],[102,19+bob],[108,41+bob],[96,56+bob],[77,62+bob],[61,50+bob],[54,31+bob]],C.ink);
  q([[64,21+bob],[81,12+bob],[97,23+bob],[102,39+bob],[91,50+bob],[77,55+bob],[65,45+bob],[60,31+bob]],robe);
  q([[66,31+bob],[80,25+bob],[96,32+bob],[91,46+bob],[78,51+bob],[68,42+bob]],C.void);
  r(69,34+bob,9,3,trim);r(84,34+bob,12,3,trim);r(74,35+bob,3,2,C.white);r(89,35+bob,3,2,C.white);
  q([[79,35+bob],[84,45+bob],[78,47+bob]],light);r(76,48+bob,12,3,C.shadow);
  if(hex){
    q([[64,22],[51,13],[48,0],[39,6],[42,24],[59,33]],C.ink);q([[64,22],[53,16],[50,4],[45,8],[47,22],[60,28]],C.copper);
    q([[96,22],[113,8],[113,0],[124,8],[119,26],[103,34]],C.ink);q([[98,23],[114,13],[115,5],[119,10],[116,22],[103,29]],C.copper);
    l(148,179,148,35,6,C.ink);l(148,179,148,35,2,C.copper);q([[148,34],[130,26],[116,28],[124,18],[146,16],[159,27],[158,36]],C.ivory);
    r(4,72+bob,6,10,C.crimson);r(6,70+bob,2,6,C.fire);r(148,62-bob,4,8,C.crimson);
    const sway=state==='run'?Math.sin(frame*Math.PI/2)*9:0;
    q([[53,153],[79+sway,172],[102,159],[114+sway/2,177],[88,184],[51+sway,182],[39,174]],C.ink);l(48+sway,177,69,180,2,C.crimson);
  }else{
    q([[62,24],[51,4],[70,12],[79,0],[91,11],[112,3],[102,29]],C.ink);
    q([[65,20],[60,10],[73,17],[80,7],[88,18],[103,10],[99,24]],C.ivory);
    e(80,11,4,4,C.violet);r(58,23,44,3,C.copper);
    l(44,144,37,174,16,C.ink);l(44,144,37,174,8,C.light);r(24,173,25,11,C.ink);r(29,174,18,5,C.steel);
    l(110,145,118,174,16,C.ink);l(110,145,118,174,8,C.light);r(107,173,28,11,C.ink);r(111,174,20,5,C.steel);
    q([[4,101],[14,83],[9,60],[25,74],[38,61],[30,41],[50,52],[62,42],[48,69],[38,113]],C.shadow);
    q([[116,45],[130,59],[138,43],[141,73],[158,73],[147,97],[157,125],[133,108],[127,82]],C.shadow);
    l(42,66,18,95,2,C.violet);l(130,75,148,101,2,C.violet);
    for(let i=0;i<5;i++){r(16+i*29,24+(i%2)*10,3,3,C.violet);}
  }
  if(state==='attack'){
    l(52,70,37-frame*3,75-frame*5,9,C.ink);l(52,70,37-frame*3,75-frame*5,5,light);
    l(109,69,125+frame*4,67-frame*5,9,C.ink);l(109,69,125+frame*4,67-frame*5,5,light);
    e(138,59-frame*4,7+frame,8,trim);e(138,59-frame*4,3,4,C.white);r(70,33+bob,7,4,C.ivory);r(86,33+bob,9,4,C.ivory);
  }
  if(state==='run'&&!hex){const s=Math.sin(frame*Math.PI/2)*9;l(48,144,37+s,174,11,C.light);l(110,144,118-s,174,11,C.light);r(25+s,174,22,9,C.steel);r(108-s,174,25,9,C.steel);}
  if(state==='hurt'){q([[67,31],[78,38],[73,44]],C.red);l(64,61,73,75,2,C.red);l(100,118,106,109,2,C.red);r(75,48+bob,16,5,C.crimson);}
}

function survivor(p, id) {
  const {rect:r,poly:q,line:l}=p,C=PALETTE;
  const coat=id==='mira'?C.amberDark:id==='orren'?'#555c61':'#423754',edge=id==='mira'?C.amber:id==='orren'?C.ivory:C.violet;
  l(29,50,25,71,8,C.ink);l(35,50,37,71,8,C.ink);l(29,50,25,71,4,C.steel);l(35,50,37,71,4,C.mid);
  r(20,71,13,5,C.ink);r(33,71,14,5,C.ink);r(23,72,8,2,C.light);r(36,72,8,2,C.light);
  q([[22,28],[34,25],[42,35],[40,52],[45,64],[34,64],[30,55],[25,65],[17,62],[20,48],[17,36]],C.ink);
  q([[24,30],[33,28],[38,36],[36,52],[40,61],[34,59],[30,51],[25,61],[21,59],[25,46],[21,36]],coat);
  l(25,31,30,48,2,edge);r(23,48,16,4,C.shadow);r(29,48,5,3,C.copper);
  l(19,33,13,48,8,C.ink);l(19,33,13,48,4,coat);l(13,48,19,54,4,C.ivory);
  l(39,33,47,46,8,C.ink);l(39,33,47,46,4,coat);l(47,46,43,51,4,C.ivory);
  r(26,13,14,16,C.ink);q([[28,15],[36,14],[39,20],[37,25],[30,27],[26,23]],C.copper);
  r(28,17,12,2,C.shadow);r(34,19,4,2,C.ivory);r(31,24,6,2,C.amberDark);
  if(id==='mira'){q([[24,12],[34,10],[41,17],[26,18],[23,24]],C.steel);r(27,17,12,4,C.ink);r(28,17,10,2,C.cyan);r(25,27,14,4,C.amber);l(27,30,10,38,4,C.amberDark);r(18,35,6,15,C.shadow);}
  if(id==='orren'){q([[24,14],[29,9],[38,11],[40,16],[31,14],[26,18]],C.snow);r(29,23,9,7,C.snow);r(30,25,4,5,C.light);r(43,44,12,15,C.ink);r(45,46,8,11,C.ivory);r(47,48,4,2,C.copper);}
  if(id==='vesper'){q([[25,14],[29,10],[39,13],[40,18],[32,15],[26,19]],C.ink);l(29,18,32,23,2,C.crimson);r(27,26,12,5,C.violet);r(17,32,7,5,C.light);r(37,30,7,5,C.steel);r(41,45,13,5,C.ink);r(43,45,9,2,C.mid);}
}

function portrait(p,id){
  const {rect:r,poly:q,line:l}=p,C=PALETTE;
  const coat=id==='mira'?'#6b4b32':id==='orren'?'#495256':'#40364d',accent=id==='mira'?C.amber:id==='orren'?C.ivory:C.violet;
  r(0,0,96,96,C.void);r(3,3,90,90,C.shadow);
  for(let y=9;y<85;y+=6)r(8,y,80,2,'#1b2f3e');
  q([[3,95],[11,73],[31,61],[63,59],[85,71],[93,96]],C.ink);q([[8,95],[16,76],[33,65],[61,63],[80,75],[88,96]],coat);
  r(36,52,23,18,C.amberDark);q([[26,19],[40,11],[61,14],[73,29],[69,48],[57,62],[40,60],[25,46],[22,31]],C.ink);
  q([[28,22],[40,15],[58,18],[67,29],[63,46],[55,56],[41,55],[30,44],[27,32]],C.copper);
  q([[30,23],[42,18],[55,21],[60,29],[48,32],[34,29]],'#edbb92');
  q([[51,31],[55,44],[48,46],[44,42]],C.amberDark);r(34,33,11,3,C.shadow);r(55,32,10,3,C.shadow);r(39,34,4,2,C.ivory);r(58,33,4,2,C.ivory);r(43,49,14,3,C.amberDark);
  l(34,69,40,89,3,accent);l(67,68,60,89,3,accent);r(44,78,11,5,C.ink);r(47,79,5,2,accent);
  if(id==='mira'){q([[23,34],[23,20],[32,10],[50,8],[65,17],[70,28],[59,24],[48,15],[33,18],[27,28],[28,48],[21,55]],'#392b25');l(27,33,25,64,6,'#65432c');for(let y=38;y<63;y+=6)r(22,y,7,2,C.copper);l(33,28,44,27,2,C.amberDark);l(55,26,65,29,2,C.amberDark);r(35,33,9,2,C.ink);r(55,32,9,2,C.ink);r(40,33,2,1,C.ivory);r(58,32,2,1,C.ivory);q([[29,59],[61,57],[70,69],[43,72],[23,67]],C.amberDark);r(32,62,28,5,C.amber);}
  if(id==='orren'){q([[22,33],[20,20],[29,10],[45,7],[60,12],[67,21],[55,20],[44,17],[28,24]],C.snow);q([[29,44],[41,49],[54,48],[64,42],[61,60],[48,69],[36,61]],C.light);q([[35,51],[48,57],[59,50],[55,63],[46,65],[38,58]],C.snow);l(33,31,44,31,2,C.ivory);l(55,30,66,30,2,C.ivory);r(32,30,13,7,C.ink);r(54,29,13,7,C.ink);r(34,32,9,2,C.light);r(56,31,8,2,C.light);l(45,32,54,32,2,C.ivory);}
  if(id==='vesper'){q([[21,31],[23,17],[35,9],[56,11],[69,24],[66,31],[53,20],[32,21],[24,41]],C.ink);l(30,29,42,47,2,C.crimson);r(42,45,4,3,C.crimson);q([[27,59],[60,55],[68,67],[55,75],[26,70]],'#58416a');l(31,63,62,61,3,C.violet);r(17,71,14,8,C.mid);r(18,72,10,2,C.ivory);}
  r(1,1,94,2,accent);r(1,93,94,2,accent);r(1,2,2,92,C.mid);r(93,2,2,92,C.mid);
}

const ICON_IDS=['rustfang','katana','saber','carbine','scatter','rail','cannon','rocket','courier','bulwark','wraith','cinder','siphon','thunder','veil','stasis','eclipse','clone','wolf','dragon','ember-heart','tide-glass','storm-seal','eclipse-fragment','regent-key','soul-core'];
function icon(p,id){
  const {rect:r,poly:q,line:l,ellipse:e}=p,C=PALETTE;
  if(id==='rocket'){weapon(translated(p,0,10,.6),'launcher');return;}
  if(id==='clone'){courier(translated(p,4,0,.62),'idle',0);l(6,15,6,37,1,C.cyan);l(9,37,15,40,1,C.cyan);return;}
  if(id==='wolf'){wolf(translated(p,0,8,.5),1);return;}
  if(id==='dragon'){dragon(translated(p,0,7,.3),1);return;}
  const swords=['rustfang','katana','saber'],guns=['carbine','scatter','rail','cannon'],armors=['courier','bulwark','wraith'];
  if(swords.includes(id)){
    const edge=id==='rustfang'?C.copper:id==='katana'?C.cyan:C.violet;
    l(12,37,35,7,7,C.ink);l(13,35,35,7,4,edge);l(16,32,35,7,2,C.ivory);l(7,34,20,44,6,C.ink);l(8,34,20,43,2,C.copper);l(12,38,7,44,4,C.shadow);r(5,42,4,4,C.light);
    if(id==='katana')l(31,10,39,4,2,C.cyan);if(id==='saber'){r(29,12,2,2,C.white);r(38,7,2,2,C.violet);}
  }else if(guns.includes(id)){
    const massive=id==='cannon';r(4,massive?14:18,39,massive?16:9,C.ink);r(7,massive?16:20,31,massive?10:5,C.mid);r(12,17,16,3,C.light);r(38,18,6,8,C.steel);r(18,25,7,13,C.ink);r(20,27,3,8,C.copper);r(7,27,5,6,C.shadow);
    if(id==='scatter'){r(10,26,28,3,C.light);r(27,17,10,3,C.copper);}if(id==='rail'){l(8,14,40,14,3,C.shadow);r(12,12,10,3,C.light);r(30,20,11,2,C.electric);}if(massive){r(7,13,26,3,C.violet);r(9,21,14,5,C.cyan);r(12,22,7,2,C.white);r(32,18,4,11,C.shadow);r(38,16,7,13,C.copper);}
  }else if(armors.includes(id)){
    const tint=id==='courier'?C.amber:id==='bulwark'?C.ivory:C.violet;
    q([[9,10],[17,8],[23,14],[30,8],[40,11],[44,24],[35,25],[36,40],[13,40],[12,25],[3,23]],C.ink);
    q([[11,12],[17,11],[23,18],[30,11],[37,13],[40,22],[32,23],[33,37],[16,37],[16,23],[7,21]],C.steel);
    l(17,17,22,28,3,tint);l(30,16,26,28,3,tint);r(21,27,7,7,C.shadow);r(22,28,5,3,tint);r(16,36,17,2,C.light);
    if(id==='wraith')q([[10,9],[24,3],[39,10],[29,17],[24,12],[17,17]],'#46385e');
  }else{
    const tint={cinder:C.red,siphon:C.violet,thunder:C.cyan,veil:C.violet,stasis:C.cyan,eclipse:C.violet,'ember-heart':C.fire,'tide-glass':C.cyan,'storm-seal':C.cyan,'eclipse-fragment':C.violet,'regent-key':C.ivory,'soul-core':C.ivory}[id]||C.amber;
    e(24,24,19,19,C.ink);e(24,24,16,16,C.shadow);e(24,24,14,14,tint);e(24,24,11,11,C.void);
    if(id==='cinder'||id==='ember-heart'){q([[13,30],[16,19],[22,24],[27,10],[32,24],[36,30],[28,38],[19,37]],tint);q([[20,31],[24,22],[29,30],[26,35]],C.ivory);}
    else if(id==='thunder'||id==='storm-seal'){q([[26,8],[15,26],[23,26],[18,39],[34,21],[26,21]],tint);l(26,9,19,23,2,C.ivory);}
    else if(id==='siphon'){q([[24,10],[35,27],[31,36],[23,39],[16,33],[13,27]],tint);e(25,29,4,6,C.ivory);}
    else if(id==='veil'){q([[10,25],[20,18],[28,18],[39,24],[30,31],[20,31]],tint);e(24,25,5,6,C.void);e(25,24,2,3,C.ivory);}
    else if(id==='stasis'){l(24,11,24,38,3,C.cyan);l(11,24,38,24,3,C.cyan);l(14,14,34,34,2,C.ivory);l(14,34,34,14,2,C.ivory);e(24,24,4,4,C.white);}
    else if(id==='regent-key'){e(20,17,7,8,C.ivory);e(20,17,3,4,C.void);l(20,25,20,38,5,C.ivory);r(19,30,10,3,C.ivory);r(20,36,7,3,C.ivory);}
    else if(id==='tide-glass'){q([[19,9],[29,9],[25,22],[33,36],[16,36],[23,23]],C.cyan);r(20,12,7,3,C.ivory);r(21,32,8,2,C.ivory);}
    else if(id==='soul-core'){q([[24,9],[36,20],[31,35],[21,40],[12,26],[16,16]],C.ivory);q([[24,15],[30,22],[27,31],[21,33],[18,24]],C.violet);l(23,17,21,28,2,C.white);}
    else{e(24,24,11,12,tint);e(28,21,9,10,C.void);r(14,15,2,2,C.ivory);r(34,30,2,2,C.ivory);}
    r(23,3,3,3,C.ivory);r(23,42,3,3,C.ivory);
  }
}

function capsule(p,type){
  const{rect:r,poly:q,line:l}=p,C=PALETTE;
  const ids={weapon:'carbine',sword:'rustfang',armor:'bulwark',spell:'cinder',treasure:'soul-core',cannon:'cannon',nova:'eclipse',mana:'siphon',boost:'thunder',shield:'bulwark'};
  const tint={health:C.red,fuel:C.cyan,rapid:C.electric,mana:C.violet,boost:C.electric,shield:C.ivory,spell:C.crimson,nova:C.violet}[type]||C.amber;
  q([[7,2],[32,2],[38,10],[38,39],[31,46],[8,46],[2,38],[2,10]],C.ink);
  q([[9,5],[30,5],[34,11],[34,37],[29,42],[10,42],[6,37],[6,11]],C.steel);r(9,10,22,27,C.void);r(10,6,19,3,tint);r(10,40,19,2,tint);r(5,14,2,16,C.light);r(34,14,2,16,C.light);
  if(ids[type])icon(translated(p,3,8,.7),ids[type]);
  else if(type==='health'){q([[11,22],[15,15],[20,19],[25,15],[30,22],[20,34]],C.red);r(18,19,4,12,C.ivory);r(14,23,12,4,C.ivory);}
  else if(type==='fuel'){r(13,16,14,18,C.ink);r(15,18,10,13,C.cyanDark);r(18,14,5,4,C.light);r(17,20,4,7,C.cyan);q([[15,32],[20,37],[25,32]],C.fire);}
  else{for(let x=13;x<30;x+=6){r(x,17,3,16,C.electric);q([[x,17],[x+2,12],[x+4,17]],C.ivory);}l(10,35,29,35,2,C.copper);}
}

function campaignProp(p,type){
  const{rect:r,poly:q,line:l,ellipse:e}=p,C=PALETTE;
  if(type==='barrel'){e(32,11,24,9,C.ink);r(8,11,48,58,C.ink);e(32,69,24,9,C.ink);r(10,12,44,57,C.rust);r(13,15,5,48,C.copper);r(48,16,4,45,C.amberDark);for(const y of[18,54]){r(8,y,48,7,C.shadow);r(10,y,44,2,C.mid);}e(32,10,21,6,C.mid);e(32,10,16,3,C.shadow);q([[24,34],[40,34],[44,43],[32,49],[20,43]],C.ink);q([[32,36],[37,44],[26,44]],C.fire);r(31,39,2,3,C.ink);}
  else if(type==='cache'){prop(p,'crate');r(14,17,36,34,C.ink);r(17,20,30,26,'#392940');l(19,21,19,43,2,C.violet);l(44,21,44,43,2,C.violet);icon(translated(p,17,20,.6),'soul-core');r(26,53,12,3,C.violet);}
  else if(type==='lever'){r(6,48,36,14,C.ink);r(8,50,32,9,C.steel);r(11,51,25,2,C.light);r(16,26,16,25,C.ink);r(18,28,12,20,C.mid);e(24,33,6,6,C.shadow);l(24,33,35,12,6,C.ink);l(24,33,35,12,2,C.copper);r(30,8,13,7,C.red);r(31,9,10,2,C.ivory);r(17,45,5,3,C.electric);}
  else{r(0,0,96,192,C.ink);r(5,4,86,183,C.steel);r(12,12,72,173,C.void);for(let x=18;x<82;x+=14){r(x,17,7,161,C.mid);r(x,17,2,161,C.light);}r(9,56,79,8,C.shadow);r(10,58,77,2,C.copper);r(9,124,79,8,C.shadow);r(10,126,77,2,C.copper);r(14,178,70,8,C.rust);r(39,74,20,39,C.ink);icon(translated(p,28,72,.85),'regent-key');for(const y of[7,181])for(const x of[6,86]){r(x,y,4,4,C.ink);r(x,y,2,2,C.ivory);}r(37,4,24,5,C.crimson);}
}

function biome(p,kind,layer){
  if(kind==='snow'){(layer==='far'?far:mid)(p);return;}
  const{rect:r,poly:q,line:l,ellipse:e}=p,C=PALETTE;
  const colors={ruins:['#11232c','#1a3742','#35535a',C.cyan],furnace:['#200e1c','#3c1b26','#6c3137',C.fire],storm:['#171329','#30263f','#534566',C.electric],eclipse:['#1c0e21','#352039','#684156',C.crimson],reactor:['#071a21','#132c37','#24505a',C.violet]}[kind];
  const[a,b,d,accent]=colors;
  if(layer==='far'){
    r(0,0,960,720,a);for(let y=0;y<720;y+=24)r(0,y,960,2,b);
    if(kind==='ruins'){
      e(720,117,54,48,b);e(730,116,43,38,d);q([[0,344],[85,299],[149,330],[246,279],[338,336],[429,295],[517,354],[626,307],[722,337],[837,295],[960,344],[960,720],[0,720]],b);
      for(let x=30;x<940;x+=134){r(x,231+(x%3)*15,75,273,a);q([[x,251],[x+36,220],[x+75,249]],d);r(x+8,268,59,8,d);r(x+13,285,49,218,b);for(let y=297;y<470;y+=26)r(x+18,y,39,2,d);}
      r(0,510,960,210,'#173c49');for(let i=0;i<62;i++)r((i*157)%960,521+i%20*9,12+i%6*8,2,i%4?'#24515b':'#5a7c7e');
    }else if(kind==='furnace'){
      q([[0,0],[960,0],[960,167],[874,113],[787,201],[715,127],[640,230],[555,152],[459,237],[341,142],[252,189],[134,103],[0,151]],b);
      e(504,535,205,254,b);e(504,535,155,214,d);e(504,548,120,180,'#8b3e37');e(504,562,89,143,'#b46243');
      for(let x=24;x<940;x+=154){r(x,309+(x%7)*14,69,411,a);r(x+8,321+(x%7)*14,8,299,d);r(x+52,322+(x%7)*14,5,301,b);q([[x-13,339],[x+34,281],[x+81,339]],b);}
      r(0,654,960,66,'#9b4537');for(let x=0;x<960;x+=18)r(x,655+(x%13)*3,12,2,C.fire);
    }else if(kind==='storm'){
      for(let i=0;i<29;i++)e(70+(i*167)%810,69+i%6*26,50+i%4*22,12+i%3*6,b);
      q([[0,461],[109,381],[195,420],[302,346],[414,451],[551,367],[678,419],[801,339],[960,461],[960,720],[0,720]],b);
      for(let i=0;i<6;i++){const x=67+i*153,top=200+(i*77%159);q([[x,720],[x,top+62],[x+25,top+30],[x+36,top-89],[x+46,top+32],[x+76,top+65],[x+76,720]],a);r(x+33,top-62,4,340,d);r(x+9,top+79,59,5,d);for(let y=top+100;y<600;y+=35)r(x+25,y,6,12,d);}
      l(481,23,460,108,3,d);l(460,108,499,140,3,d);l(499,140,473,244,3,d);l(499,140,528,163,2,accent);
    }else if(kind==='eclipse'){
      e(637,179,121,121,b);e(637,179,93,93,d);e(647,173,82,82,a);e(655,169,72,72,a);
      for(let i=0;i<8;i++){const x=32+i*117,top=267+(i*41%116);r(x,top,66,720-top,a);q([[x-10,top],[x+31,top-71],[x+76,top]],b);r(x+12,top+14,42,3,d);for(let y=top+35;y<626;y+=51){q([[x+24,y],[x+33,y-14],[x+42,y],[x+42,y+18],[x+24,y+18]],d);}}
      r(0,640,960,80,b);for(let x=22;x<960;x+=47)r(x,649,12,3,d);
    }else{
      for(let x=0;x<960;x+=128){r(x,0,120,720,b);r(x+3,0,4,720,d);r(x+110,0,8,720,a);for(let y=12;y<720;y+=96){r(x+14,y,85,63,a);for(let j=0;j<6;j++)r(x+19+j*13,y+6,3,42,d);r(x+16,y+58,70,2,C.cyanDark);}}
      e(621,318,199,237,a);e(621,318,179,217,d);e(621,318,154,190,b);e(621,318,117,155,'#513754');e(621,318,91,129,a);e(621,318,58,97,'#343051');e(621,318,28,77,C.violet);e(621,318,12,59,C.ivory);
      for(let i=0;i<12;i++){const angle=i*Math.PI/6;l(621+Math.cos(angle)*130,318+Math.sin(angle)*174,621+Math.cos(angle)*175,318+Math.sin(angle)*220,7,C.shadow);}
    }
    for(let i=0;i<64;i++)r(35+(i*139)%890,21+(i*59)%230,2,2,kind==='furnace'?C.copper:d);
  }else{
    if(kind==='ruins'){
      for(const x of[47,679]){r(x,395,102,325,a);r(x+9,402,83,10,d);r(x+15,421,9,283,b);r(x+78,423,8,281,b);q([[x-8,394],[x+16,362],[x+86,369],[x+111,395]],b);l(x+11,406,x+43,464,3,d);}
      r(147,431,534,17,a);for(let x=149;x<677;x+=48){r(x,421,8,13,b);l(x,448,x+44,487,3,b);}r(0,687,960,33,b);for(let x=2;x<960;x+=61)r(x,696,25,2,d);
    }else if(kind==='furnace'){
      for(const x of[54,735]){r(x,228,55,492,a);r(x+4,237,8,463,b);for(let y=244;y<708;y+=62){r(x-7,y,69,11,b);r(x-5,y+2,64,2,d);}}
      for(let i=0;i<4;i++){const x=176+i*147;l(x,0,x,241+i%2*54,4,b);q([[x-10,234+i%2*54],[x+13,234+i%2*54],[x+18,263+i%2*54],[x-18,263+i%2*54]],a);r(x-6,249+i%2*54,12,7,C.fire);}
      r(0,697,960,23,a);r(0,697,960,3,d);
    }else if(kind==='storm'){
      for(const x of[61,728]){r(x,297,85,423,a);r(x+5,300,75,4,d);for(let y=333;y<715;y+=54){r(x+13,y,59,4,b);l(x+17,y+6,x+65,y+48,2,b);l(x+65,y+6,x+17,y+48,2,b);}l(x+43,298,x+43,191,4,b);r(x+37,196,12,5,accent);}
      l(146,353,727,429,4,a);l(146,357,727,433,2,b);r(311,487,161,233,a);r(324,502,135,7,b);
    }else if(kind==='eclipse'){
      for(const x of[41,706]){q([[x,720],[x,382],[x+15,346],[x+49,307],[x+78,347],[x+93,382],[x+93,720]],a);q([[x+23,396],[x+47,363],[x+71,396],[x+71,500],[x+23,500]],b);l(x+47,368,x+47,495,4,d);for(let y=517;y<700;y+=45)r(x+13,y,67,3,b);r(x+41,402,12,21,accent);}
      r(133,513,574,14,a);for(let x=156;x<704;x+=44){r(x,481,5,32,b);q([[x-4,481],[x+2,469],[x+8,481]],d);}
    }else{
      for(const x of[37,801]){r(x,0,72,720,a);r(x+5,0,6,720,d);for(let y=23;y<720;y+=87){r(x-6,y,86,14,b);r(x-2,y+3,78,4,d);r(x+19,y+22,33,6,accent);}}
      l(109,526,391,643,12,a);l(109,522,391,639,4,b);l(798,489,713,634,12,a);l(798,485,713,630,4,b);r(0,697,960,23,a);r(0,696,960,3,accent);
    }
  }
}

export const WORLD_ART=Object.freeze({
  soulforge:{far:'background-far-snow',mid:'background-mid-snow',decor:'tech-console',tile:'tile-steel'},
  tide:{far:'background-far-ruins',mid:'background-mid-ruins',decor:'sea-wave-0',tile:'tile-tide'},
  pyre:{far:'background-far-furnace',mid:'background-mid-furnace',decor:'fire-column-0',tile:'tile-pyre'},
  neon:{far:'background-far-reactor',mid:'background-mid-reactor',decor:'tech-cables',tile:'tile-neon'},
  veil:{far:'background-far-eclipse',mid:'background-mid-eclipse',decor:'wizard-tree',tile:'tile-veil'},
});

function ring(p,cx,cy,rx,ry,width,color,phase=0){
  for(let i=0;i<64;i++){
    const a=i*Math.PI/32+phase,b=(i+1)*Math.PI/32+phase;
    p.line(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,cx+Math.cos(b)*rx,cy+Math.sin(b)*ry,width,color);
  }
}

function wizard(p,type,frame,state='idle'){
  const{rect:r,poly:q,line:l,ellipse:e}=p,C=PALETTE,witch=type==='witch',bob=frame%2,coat=witch?'#4c254d':'#294d65',trim=witch?C.crimson:C.copper;
  const stride=state==='idle'?Math.sin(frame*Math.PI/2)*2:0;
  l(35,67,29-stride,87,8,C.ink);l(45,67,50+stride,87,8,C.ink);r(22-stride,86,15,6,C.steel);r(44+stride,86,18,6,C.steel);r(24-stride,87,9,2,C.light);r(46+stride,87,10,2,C.light);
  q([[27,31],[45,29],[55,42],[53,61],[62,86],[46,89],[40,76],[32,90],[15,85],[23,63],[20,44]],C.ink);
  q([[29,33],[44,32],[50,44],[47,65],[55,84],[46,85],[39,69],[31,86],[21,83],[30,60],[25,44]],coat);
  q([[31,34],[38,36],[35,64],[24,81],[30,60],[26,42]],witch?'#733459':'#3b6680');
  l(32,36,36,62,2,trim);l(45,36,42,62,2,trim);r(29,59,22,4,C.ink);r(38,59,6,3,C.ivory);
  for(let y=42;y<60;y+=5){r(39,y,3,2,C.ivory);r(32,y,2,1,trim);}
  l(25,38,16,53,9,C.ink);l(25,38,16,53,5,coat);l(16,53,20,60,5,C.copper);
  const hand=state==='cast'?[60,37-frame*3]:[59,56];
  l(48,37,54,48,9,C.ink);l(48,37,54,48,5,coat);l(54,48,...hand,5,C.copper);r(hand[0]-2,hand[1]-2,5,5,C.ivory);
  q([[29,13+bob],[41,10+bob],[51,17+bob],[51,28+bob],[44,37+bob],[34,36+bob],[27,28+bob]],C.ink);
  q([[31,15+bob],[41,13+bob],[47,19+bob],[47,28+bob],[42,33+bob],[35,32+bob],[30,26+bob]],C.copper);
  r(33,21+bob,5,2,C.ink);r(42,20+bob,6,2,C.ink);r(35,21+bob,2,1,C.ivory);r(44,20+bob,2,1,C.ivory);q([[39,22],[42,28],[38,28]],C.amberDark);r(36,30+bob,8,2,C.amberDark);
  if(witch){
    q([[25,15],[28,5],[40,1],[46,8],[52,17],[60,20],[60,24],[22,26],[17,22]],C.ink);
    q([[27,15],[31,8],[39,4],[43,9],[47,17],[53,20],[26,22],[22,21]],'#51445e');l(30,18,49,18,3,C.crimson);r(39,16,4,4,C.ivory);
    q([[27,21],[31,25],[30,41],[23,48],[21,36]],'#21172f');q([[48,21],[54,28],[51,45],[45,51],[46,31]],'#21172f');l(49,29,48,41,1,C.violet);
    l(62,85,66,25,5,C.ink);l(62,85,66,25,2,C.copper);q([[57,26],[62,17],[68,16],[72,24],[69,34],[62,36]],C.ink);e(65,25,5,7,C.violet);e(65,25,2,4,C.ivory);
  }else{
    q([[27,21],[25,11],[33,5],[45,7],[52,16],[46,17],[42,11],[31,14]],C.snow);
    q([[30,26],[36,31],[44,30],[49,25],[47,40],[41,45],[33,39]],C.ivory);l(33,34,38,41,1,C.light);l(44,33,42,41,1,C.light);
    l(64,89,64,15,6,C.ink);l(64,89,64,15,2,C.copper);q([[58,17],[54,8],[61,4],[71,8],[73,16],[67,22]],C.ink);e(64,12,7,8,C.cyanDark);e(64,12,3,4,C.ivory);l(58,8,70,16,1,C.copper);
    r(12,55,15,20,C.ink);r(14,57,11,16,C.ivory);l(17,60,22,60,1,C.copper);l(17,64,22,64,1,C.copper);r(20,57,2,16,C.rust);
  }
  if(state==='cast'){ring(p,61,36-frame*3,8+frame*2,8+frame*2,1,trim,frame*.2);r(59,35-frame*3,4,3,C.white);}
  if(state==='hurt'){l(31,23,37,25,1,C.red);l(43,22,48,23,1,C.red);r(37,31,8,3,C.crimson);}
}

function friend(p,id,frame=0){
  if(id==='orren'){wizard(translated(p,0,2.4,.8),'wizard',frame);return;}
  const{rect:r,poly:q,line:l}=p,C=PALETTE,mira=id==='mira',coat=mira?'#8c613b':'#443758',trim=mira?C.amber:C.violet,bob=frame%2;
  l(27,51,23,71,8,C.ink);l(36,51,40,71,8,C.ink);l(27,51,23,71,4,C.mid);l(36,51,40,71,4,C.light);r(18,71,13,5,C.ink);r(35,71,15,5,C.ink);r(20,72,8,2,C.ivory);r(37,72,10,2,C.ivory);
  q([[22,28],[37,27],[44,40],[41,52],[47,65],[36,66],[29,57],[23,66],[15,62],[19,46],[17,35]],C.ink);
  q([[23,30],[36,30],[40,40],[36,53],[40,61],[34,61],[29,51],[23,62],[19,59],[24,44],[21,35]],coat);
  l(25,32,29,46,2,trim);l(35,31,32,47,2,C.ivory);r(23,48,16,4,C.shadow);r(29,48,5,3,C.copper);r(22,41,4,6,C.shadow);r(35,40,4,6,C.shadow);
  l(20,33,13,47,8,C.ink);l(20,33,13,47,4,coat);l(13,47,18,55,4,C.copper);l(40,34,47,47,8,C.ink);l(40,34,47,47,4,coat);l(47,47,43,52,4,C.copper);
  q([[24,14+bob],[32,10+bob],[40,13+bob],[43,20+bob],[39,29+bob],[31,30+bob],[24,25+bob]],C.ink);
  q([[27,16+bob],[32,13+bob],[38,16+bob],[40,22+bob],[37,26+bob],[31,27+bob],[27,23+bob]],C.copper);
  q([[28,17+bob],[32,15+bob],[37,17+bob],[37,20+bob],[29,20+bob]],'#edbc96');r(30,21+bob,4,1,C.ink);r(37,20+bob,4,1,C.ink);r(32,21+bob,1,1,C.ivory);r(38,20+bob,1,1,C.ivory);r(33,25+bob,5,1,C.amberDark);
  q([[23,19],[23,12],[29,8],[38,11],[43,18],[39,17],[34,12],[27,15],[25,27]],mira?'#45352c':'#241b30');
  l(25,23,23,40,3,mira?'#67472e':'#32213e');for(let y=25;y<39;y+=4)r(22,y,3,1,trim);
  q([[24,28],[38,27],[43,32],[32,35],[22,31]],trim);l(25,32,12,38,4,coat);
  if(mira){l(43,37,52,60,4,C.ink);l(43,38,52,59,2,C.copper);l(43,37,52,59,1,C.ivory);l(43,37,44,52,1,C.ivory);l(44,52,52,59,1,C.ivory);l(13,37,21,32,3,C.mid);r(14,32,7,9,C.rust);r(16,32,1,9,C.ivory);}
  else{l(28,19,31,24,1,C.crimson);r(39,33,8,5,C.light);r(17,32,7,6,C.mid);r(39,52,17,5,C.ink);r(42,52,12,2,C.light);r(43,57,5,4,C.mid);l(17,47,10,61,2,C.ivory);}
}

function weapon(p,type){
  const{rect:r,poly:q,line:l,ellipse:e}=p,C=PALETTE;
  r(7,15,58,14,C.ink);r(12,17,48,9,C.steel);r(14,16,40,3,C.light);r(12,28,8,10,C.ink);r(14,28,5,8,C.rust);r(23,25,7,11,C.ink);r(24,26,5,8,C.mid);r(20,18,16,2,C.copper);r(57,18,20,6,C.ink);r(59,19,18,2,C.light);
  if(type==='scatter'){r(35,22,40,8,C.shadow);r(37,22,35,2,C.light);r(41,15,27,4,C.copper);r(40,26,20,5,C.rust);r(71,16,7,15,C.ink);}
  if(type==='rail'){r(23,7,26,7,C.ink);r(25,9,22,3,C.light);r(39,17,24,3,C.cyan);r(64,17,15,7,C.mid);l(9,12,69,12,2,C.shadow);}
  if(type==='cannon'){q([[5,13],[16,7],[55,9],[66,14],[66,31],[18,31],[7,27]],C.ink);r(13,12,46,16,C.steel);r(16,10,35,3,C.violet);r(22,16,25,8,C.violet);r(28,18,14,3,C.white);r(60,13,17,18,C.copper);r(65,15,11,13,C.shadow);r(68,18,10,5,C.violet);}
  if(type==='launcher'){q([[4,12],[15,7],[64,9],[77,16],[77,29],[15,30],[4,24]],C.ink);r(12,12,51,13,C.rust);r(15,11,43,3,C.copper);r(63,12,15,15,C.mid);e(72,20,6,7,C.ink);e(73,20,3,4,C.red);r(31,6,18,5,C.shadow);r(34,7,11,2,C.light);r(39,28,10,8,C.ink);}
}

function projectile(p,type){
  const{rect:r,poly:q,line:l}=p,C=PALETTE;
  if(['rocket','pressure'].includes(type)){
    q([[15,6],[33,6],[44,12],[33,18],[15,18],[10,12]],C.ink);q([[18,8],[33,8],[40,12],[33,16],[18,16]],C.light);r(21,8,10,2,C.ivory);r(27,12,8,3,C.rust);q([[17,6],[11,2],[12,8]],C.steel);q([[17,18],[11,22],[12,16]],C.steel);r(33,10,5,4,C.crimson);q([[13,8],[1,12],[13,16]],C.red);q([[13,10],[5,12],[13,14]],C.fire);return;
  }
  if(['fire','dragonfire'].includes(type)){q([[43,11],[35,4],[23,6],[11,3],[17,9],[2,12],[17,15],[9,21],[24,18],[36,20]],C.red);q([[38,12],[31,8],[20,10],[11,12],[24,15],[33,16]],C.fire);r(26,11,10,3,C.ivory);return;}
  if(['hex','needle','arc','ally'].includes(type)){const tint=type==='ally'?C.cyan:C.violet;q([[42,12],[29,5],[12,8],[3,12],[12,16],[29,19]],C.ink);q([[39,12],[29,8],[14,10],[7,12],[14,14],[29,16]],tint);l(18,12,37,12,2,C.white);r(7,5,2,2,tint);r(12,20,2,2,tint);return;}
  const tint=type==='rail'?C.cyan:type==='scatter'?C.copper:C.amber;
  r(type==='rail'?3:17,9,type==='rail'?40:25,6,C.ink);r(type==='rail'?5:20,10,type==='rail'?38:22,3,tint);r(31,10,10,1,C.ivory);if(type==='scatter'){r(20,7,5,3,C.rust);r(27,14,6,3,C.rust);}
}

function ward(p,frame,kind='shield'){
  const C=PALETTE,cx=kind==='shield'?48:64,cy=kind==='shield'?56:64;
  const rx=kind==='shield'?[17,30,42,41][frame]:[26,41,53,55][frame],ry=kind==='shield'?rx*1.18:rx;
  ring(p,cx,cy,rx,ry,3,C.cyanDark);ring(p,cx,cy,rx-2,ry-2,1,kind==='portal'?C.violet:C.ivory);
  ring(p,cx,cy,rx-7,ry-7,1,kind==='portal'?C.crimson:C.cyan);
  for(let i=0;i<8;i++){const a=i*Math.PI/4+frame*.13,x=cx+Math.cos(a)*(rx-5),y=cy+Math.sin(a)*(ry-5);p.line(x-3,y-3,x+3,y+3,1,C.white);p.line(x-3,y+3,x+3,y-3,1,kind==='portal'?C.violet:C.cyan);}
  if(kind==='portal'){ring(p,cx,cy,rx-13,ry-13,2,C.violet,frame*.2);for(let i=0;i<4;i++){const a=i*Math.PI/2+frame*.3;p.rect(cx+Math.cos(a)*23,cy+Math.sin(a)*30,3,6,C.ivory);}}
  if(kind==='circle'){p.line(31,36,98,96,2,C.violet);p.line(33,95,96,35,2,C.violet);p.line(24,66,103,66,1,C.copper);}
}

function wolf(p,frame){
  const{rect:r,poly:q,line:l}=p,C=PALETTE,s=Math.sin(frame*Math.PI/2)*7;
  l(32,35,24+s,54,9,C.ink);l(24+s,54,19+s,58,6,C.mid);l(66,35,71-s,54,9,C.ink);l(71-s,54,80-s,58,6,C.mid);
  q([[17,23],[33,15],[58,17],[76,26],[73,42],[56,47],[35,42],[20,35]],C.ink);
  q([[21,24],[34,19],[57,20],[71,28],[67,38],[54,42],[36,38],[24,32]],'#496273');
  q([[24,23],[38,19],[58,22],[64,29],[47,28],[33,30]],C.light);q([[57,22],[67,10],[78,7],[86,12],[87,23],[95,28],[92,35],[80,37],[71,31],[66,38]],C.ink);
  q([[66,23],[70,14],[77,11],[83,15],[82,24],[91,28],[90,31],[81,32],[75,26]],C.light);
  q([[72,12],[68,2],[79,9]],C.ink);q([[80,12],[83,5],[86,17]],C.ink);r(80,18,6,2,C.cyan);r(89,27,5,3,C.ink);r(79,30,11,1,C.ivory);
  q([[22,25],[11,17],[3,20],[8,27],[17,30]],C.ink);l(18,24,7,21,5,C.light);
  l(35,35,32-s,55,8,C.ink);l(35,35,32-s,53,4,C.snow);r(25-s,55,14,5,C.ink);r(28-s,56,8,2,C.light);
  l(65,35,59+s,54,8,C.ink);l(65,35,59+s,53,4,C.snow);r(57+s,55,14,5,C.ink);r(59+s,56,8,2,C.light);
  for(let x=27;x<62;x+=7)l(x,25,x-4,30,1,C.snow);
}

function dragon(p,frame){
  const{rect:r,poly:q,line:l}=p,C=PALETTE,lift=[0,-9,-4,6][frame];
  q([[67,51],[47,20+lift],[20,6+lift],[13,37],[33,42],[27,61],[53,58]],C.ink);
  q([[65,50],[45,25+lift],[24,13+lift],[20,34],[37,38],[33,54],[53,53]],'#385164');
  l(64,49,24,13+lift,2,C.light);l(51,43,20,34,1,C.cyanDark);l(56,47,34,54,1,C.cyanDark);
  q([[74,49],[82,13-lift],[104,4-lift],[113,36],[96,40],[112,58],[89,63]],C.ink);
  q([[77,47],[86,20-lift],[103,11-lift],[106,32],[90,38],[103,52],[90,55]],'#2b4358');l(78,49,102,12-lift,2,C.light);
  q([[26,70],[8,66],[1,75],[11,88],[40,90],[64,83],[91,71],[117,62],[131,47],[132,27],[143,24],[152,32],[154,44],[144,52],[128,55],[120,72],[97,84],[75,91],[46,98],[24,92]],C.ink);
  q([[27,73],[12,71],[5,76],[15,84],[39,85],[62,78],[90,67],[113,58],[127,44],[128,29],[142,27],[148,33],[149,42],[140,47],[124,50],[115,66],[95,78],[72,85],[44,92],[27,86]],'#446574');
  q([[54,83],[89,70],[117,62],[126,48],[132,49],[119,70],[94,82],[72,90]],C.copper);l(64,83,117,64,2,C.ivory);
  q([[133,28],[132,13],[141,21],[143,28]],C.ivory);q([[144,29],[153,18],[151,31]],C.ivory);r(139,34,8,3,C.fire);r(144,34,2,2,C.ink);r(143,42,13,3,C.ink);r(145,43,10,1,C.ivory);
  l(96,76,104,99,8,C.ink);l(97,78,104,98,4,C.mid);r(102,98,19,5,C.ink);l(118,61,131,78,6,C.ink);l(119,62,132,77,3,C.light);l(131,77,145,71,2,C.ivory);
  for(let x=34;x<113;x+=10){q([[x,82-(x-34)*.27],[x+4,73-(x-34)*.27],[x+8,80-(x-34)*.27]],C.cyanDark);r(x+2,83-(x-34)*.27,2,2,C.snow);}
}

function trap(p,frame){
  const{rect:r,poly:q,line:l}=p,C=PALETTE;
  r(1,48,94,14,C.ink);r(4,50,88,10,C.steel);r(6,51,84,2,C.light);r(10,56,76,3,C.shadow);
  const rise=[0,10,38,24][frame];
  for(let x=9;x<88;x+=19){r(x,48-rise,11,rise+6,C.ink);r(x+2,48-rise,7,rise+3,C.mid);l(x+4,50,x+4,50-rise,2,C.ivory);q([[x,48-rise],[x+3,41-rise],[x+8,41-rise],[x+11,48-rise]],C.light);r(x+3,41-rise,5,2,C.ivory);r(x+2,46-rise,7,2,C.shadow);}
  for(const x of[5,88]){r(x,54,3,3,C.ink);r(x,54,2,1,C.copper);}r(42,57,12,3,frame===1?C.fire:frame===2?C.red:C.cyanDark);
}

function scenery(p,type,frame=0){
  const{rect:r,poly:q,line:l,ellipse:e}=p,C=PALETTE;
  if(type==='sea-wave'){
    q([[0,42],[30,36],[57,44],[88,37],[123,42],[154,34],[187,40],[220,35],[256,42],[256,96],[0,96]],'#173c49');
    for(let y=43;y<93;y+=8)for(let x=0;x<256;x+=23){const shift=(frame*7+y)%23;r(x+shift,y,12,2,y%3?C.cyanDark:C.light);}
    for(let i=0;i<8;i++){const x=i*36-frame*4,y=36+Math.sin(i+frame)*3;l(x,y,x+21,y+2,2,C.snow);r(x+6,y-3,3,2,C.ivory);}
  }else if(type==='fire-column'){
    q([[13,124],[18,89],[9,62],[30,82],[26,41],[45,58],[55,6+frame*3],[66,40],[72,66],[83,48],[89,90],[79,125]],C.crimson);
    q([[24,125],[25,91],[36,80],[38,52],[51,70],[57,24],[63,56],[69,87],[81,71],[77,108],[69,125]],C.red);
    q([[36,125],[40,94],[54,78],[58,49],[63,87],[71,109],[65,125]],C.fire);q([[47,124],[49,102],[58,91],[62,113],[58,124]],C.ivory);
    for(let i=0;i<5;i++)r(17+i*16,12+(i*17+frame*13)%65,2,4,C.fire);
  }else if(type==='dungeon-arch'){
    q([[0,160],[0,61],[17,28],[45,9],[64,4],[88,11],[113,30],[128,61],[128,160],[104,160],[104,67],[94,46],[76,30],[55,30],[34,47],[24,67],[24,160]],C.ink);
    q([[3,160],[3,62],[22,32],[47,15],[64,10],[85,16],[109,34],[123,62],[123,160],[108,160],[108,66],[98,42],[77,24],[53,25],[30,44],[19,65],[19,160]],'#3d4457');
    for(let y=68;y<159;y+=22){r(4,y,14,2,C.light);r(109,y,14,2,C.mid);l(8,y+2,10,y+19,1,C.shadow);}
    for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/6;l(64+Math.cos(a)*58,63+Math.sin(a)*53,64+Math.cos(a)*38,63+Math.sin(a)*33,2,C.shadow);}r(59,11,10,16,C.copper);
  }else if(type==='tech-console'){
    r(9,17,80,45,C.ink);r(12,20,74,38,C.steel);r(15,22,43,29,C.void);r(17,24,39,25,C.cyanDark);r(20,27,31,2,C.cyan);r(20,33,20,1,C.ivory);r(20,38,14,2,C.cyan);r(20,44,29,1,C.cyan);r(62,23,20,29,C.shadow);for(let y=28;y<48;y+=7){r(66,y,4,2,C.red);r(75,y,4,2,C.electric);}q([[18,59],[76,59],[89,72],[84,78],[10,78],[5,72]],C.ink);r(18,68,58,4,C.mid);for(let x=24;x<75;x+=8)r(x,68,3,1,C.ivory);
  }else if(type==='wizard-tree'){
    q([[45,192],[52,127],[38,99],[36,61],[19,40],[4,31],[16,30],[32,34],[29,9],[36,21],[43,36],[63,43],[79,22],[96,6],[92,23],[76,44],[83,56],[107,44],[124,42],[111,51],[91,64],[86,94],[69,128],[79,192]],C.ink);
    q([[51,192],[58,126],[45,98],[43,59],[32,43],[40,45],[64,52],[79,33],[74,54],[81,65],[95,58],[79,76],[79,94],[63,126],[71,192]],'#453950');l(61,131,61,190,2,C.mid);l(54,96,64,119,2,C.violet);l(48,58,51,90,1,C.copper);
    for(const[x,y]of[[17,31],[44,26],[85,20],[110,48],[71,81]]){l(x,y,x,y+15,1,C.copper);e(x,y+19,6,7,C.violet);e(x,y+19,2,3,C.ivory);}
  }else if(type==='tech-cables'){
    for(let i=0;i<5;i++){const x=13+i*22;l(x,0,x,34+i*7,5,C.ink);l(x,34+i*7,x+17,73+i*6,5,C.ink);l(x+17,73+i*6,x+17,128,5,C.ink);l(x,0,x,34+i*7,2,i%2?C.violet:C.cyanDark);l(x,34+i*7,x+17,73+i*6,2,C.mid);l(x+17,73+i*6,x+17,128,2,C.light);r(x-4,25+i*7,9,5,C.steel);}
  }else{
    q([[0,96],[4,64],[23,48],[31,20],[63,12],[87,31],[99,56],[125,65],[128,96]],C.ink);q([[8,96],[10,66],[28,55],[36,27],[61,19],[80,34],[90,65],[118,70],[120,96]],C.steel);q([[33,54],[38,30],[59,23],[76,36],[68,40]],C.light);l(40,45,35,71,2,C.mid);l(71,47,88,68,2,C.mid);r(36,85,37,4,C.cyanDark);
  }
}

export function createArtTextures(scene) {
  const manifest = [];
  const add = (key, width, height, anchor, notes, draw) => {
    if(scene.referenceArt&&key.startsWith('background-'))return;
    if (!scene.textures.exists(key)) {
      const p = painter(width, height, key.startsWith('background-')||key.startsWith('tile-')?2:1);
      draw(p);
      const canvas = p.finish();
      if (canvas.width !== width || canvas.height !== height) throw new Error(`Invalid art dimensions: ${key}`);
      scene.textures.addCanvas(key, canvas);
    }
    manifest.push({ key, width, height, anchor: { x: anchor[0], y: anchor[1] }, notes });
  };
  for (const [state, count] of [['idle', 4], ['run', 8], ['jump', 1], ['fall', 1], ['slash', 4]]) {
    const slash=state==='slash';
    for (let frame = 0; frame < count; frame++) add(`player-${state}-${frame}`, slash?128:64, slash?160:72, slash?[64,152]:[32,68], 'Courier faces right. Feet anchor; body stays the same size. Overhead slash has a separate gameplay hitbox.', p => courier(slash?translated(p,32,84):p, state, frame));
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
  for(const kind of ['snow','ruins','furnace','storm','eclipse','reactor'])for(const layer of ['far','mid'])add(`background-${layer}-${kind}`,960,720,[0,0],`${kind} biome ${layer} parallax layer; background only.`,p=>biome(p,kind,layer));
  for(const type of ['mage','shade','sentinel'])for(let i=0;i<4;i++)add(`${type}-${i}`,64,80,[32,76],'Enemy faces right. Feet anchor; simulation owns attacks and hurt boxes.',p=>sorcerer(p,type,i));
  for(let i=0;i<4;i++)add(`boss-warden-${i}`,128,144,[64,138],'Warden military tyrant; original plated silhouette.',p=>warden(p,i));
  for(const type of ['hex','regent'])for(let i=0;i<4;i++)add(`boss-${type}-${i}`,160,192,[80,184],`${type} sorcerous boss; tall full-size silhouette. Renderer keeps collider independent.`,p=>darkBoss(p,type,i));
  for(const id of ['mira','orren','vesper']){
    add(`portrait-${id}`,96,96,[48,48],'Original survivor portrait; displayed in dialogue.',p=>portrait(p,id));
    add(`npc-${id}`,64,80,[32,76],'Friendly survivor; no hostile or decorative collider.',p=>friend(p,id));
  }
  add('portrait-ysra',96,96,[48,48],'Ysra, the counterfeit witch guide: pointed hat, violet eyes and long dark hair. Original96px dialogue portrait.',p=>{
    const C=PALETTE;
    portrait(p,'vesper');
    p.poly([[19,34],[18,19],[32,8],[52,9],[61,20],[69,29],[62,38],[60,22],[42,17],[27,25],[28,49],[21,68],[14,73]],'#241829');
    p.poly([[63,26],[71,38],[68,61],[79,71],[67,78],[57,62],[62,43]],'#302039');
    p.line(21,38,22,62,1,C.violet);p.line(68,40,64,64,1,C.violet);
    p.poly([[10,28],[25,20],[41,5],[59,3],[57,15],[70,24],[88,29],[89,35],[65,39],[30,35],[10,33]],C.ink);
    p.poly([[18,28],[30,23],[44,10],[54,7],[52,18],[65,27],[79,30],[63,33],[32,30]],'#4c3658');
    p.line(27,27,66,30,3,C.violet);p.rect(46,27,8,5,C.copper);p.rect(49,28,3,3,C.ivory);
    p.line(34,32,44,33,2,C.shadow);p.line(55,32,65,31,2,C.shadow);
    p.rect(35,35,10,3,C.violet);p.rect(54,34,10,3,C.violet);p.rect(41,35,2,2,C.white);p.rect(58,34,2,2,C.white);
    p.rect(44,50,13,2,C.crimson);p.rect(49,49,8,1,C.ivory);
    p.line(28,64,39,76,2,C.violet);p.line(68,63,61,76,2,C.violet);
  });
  for(const type of ['health','fuel','rapid','shield','boost','mana','weapon','sword','armor','spell','treasure','cannon','nova'])add(`pickup-${type}`,40,48,[20,24],'Illustrated collectible capsule; center anchor; pickup hit test stays in simulation.',p=>capsule(p,type));
  for(const id of ICON_IDS)add(`icon-${id}`,48,48,[24,24],'Named equipment or relic glyph for armory and pickups.',p=>icon(p,id));
  for(const[key,w,h,y]of[['barrel',64,80,78],['cache',64,64,62],['lever',48,64,62],['gate',96,192,190]])add(key,w,h,[w/2,y],'Interactive campaign object; collider and destruction state come from world.',p=>campaignProp(p,key));
  for(const[style,state]of[['overhead','slash'],['horizontal','horizontal'],['finisher','finisher']])for(let i=0;i<4;i++)add(`player-slash-${style}-${i}`,128,160,[64,152],'Shared courier body; alternating overhead/lateral/finisher blade poses.',p=>courier(translated(p,32,84),state,i));
  for(let i=0;i<4;i++)add(`player-lunge-${i}`,128,160,[64,152],'Forward dash thrust; identical physical body scale and feet anchor.',p=>courier(translated(p,32,84),'lunge',i));
  for(let i=0;i<4;i++)add(`player-shoot-${i}`,64,72,[32,68],'Gun-ready body. Hand local37,41 matches weaponOrigin hand at collider center+5,y+.42h; weapon rendered separately.',p=>courier(p,'shoot',i));
  for(let i=0;i<2;i++)add(`player-hurt-${i}`,64,72,[32,68],'Brief armor impact pose; body and collider remain independent.',p=>{courier(p,'idle',i);p.line(26,31,32,37,1,PALETTE.red);p.rect(33,18,6,2,PALETTE.crimson);});
  for(const type of['warden','hex','regent'])for(const state of['run','attack','hurt'])for(let i=0;i<4;i++)add(`boss-${type}-${state}-${i}`,type==='warden'?128:160,type==='warden'?144:192,type==='warden'?[64,138]:[80,184],`Boss ${state} pose. Core local${type==='warden'?'62,61':type==='hex'?'80,106':'80,98'} aligns shared weaponOrigin core; aimed weapons render separately.`,p=>type==='warden'?warden(p,i,state):darkBoss(p,type,i,state));
  for(const type of['wizard','witch','mage'])for(const state of['idle','cast','hurt'])for(let i=0;i<4;i++)add(`${type}-${state}-${i}`,type==='mage'?64:80,type==='mage'?80:96,type==='mage'?[32,76]:[40,92],'Adult spellcaster with readable face, book/staff and casting/hurt state.',p=>type==='mage'?wizard(translated(p,0,2.4,.8),'witch',i,state):wizard(p,type,i,state));
  for(const id of['mira','orren','vesper'])for(let i=0;i<4;i++)add(`npc-${id}-${i}`,64,80,[32,76],'Human survivor idle cycle: unmasked scout, bearded wizard, scarred deserter.',p=>friend(p,id,i));
  for(const type of['bullet','carbine','scatter','rail','rocket','pressure','fire','hex','needle','arc','dragonfire','ally'])add(`projectile-${type}`,48,24,[24,12],'Right-facing projectile; rotate to actual projectile angle. Tail, casing and nose differ by weapon.',p=>projectile(p,type));
  for(const type of['carbine','scatter','rail','cannon','launcher','rocket'])add(`weapon-${type}`,80,40,[16,24],'Handle origin16,24; muzzle74,20. Render at .6scale using shared weaponOrigin hand and projectile aim angle.',p=>weapon(p,type==='rocket'?'launcher':type));
  for(let i=0;i<4;i++)add(`shield-${i}`,96,112,[48,56],'Transparent ward activation/pulse, no opaque fill over player. Center on hurt-box center.',p=>ward(p,i));
  for(const kind of['circle','portal'])for(let i=0;i<4;i++)add(`summon-${kind}-${i}`,128,128,[64,64],'Compact animated summoning glyph; visual only, no extra fullscreen canvas.',p=>ward(p,i,kind));
  for(let i=0;i<4;i++){
    add(`allied-clone-${i}`,64,72,[32,68],'Courier soul clone; renderer supplies translucent tint, movement and attacks.',p=>courier(p,'run',i*2));
    add(`wolf-${i}`,96,64,[48,60],'Right-facing armored spirit wolf; feet anchor shared across quadruped stride.',p=>wolf(p,i));
    add(`dragon-${i}`,160,112,[80,56],'Right-facing flying soul dragon; center anchor, articulated wing cycle and visible jaw.',p=>dragon(p,i));
    add(`spike-trap-${i}`,96,64,[48,60],'Mechanical blunt-toothed pistons:0 retracted,1 warning rise,2 extended,3 retracting. Hazard state owns damage.',p=>trap(p,i));
  }
  for(const type of['health','fuel','rapid','shield','boost','mana','weapon','sword','armor','spell','treasure','cannon','nova'])for(let i=0;i<4;i++)add(`pickup-${type}-${i}`,64,80,[32,40],'Animated named capsule: stable center, brief rotating glyph halo. Existing static40x48 key preserved.',p=>{capsule(translated(p,12,16),type);ring(p,32,40,25+i%2,33,1,type==='shield'?PALETTE.cyan:PALETTE.violet,i*.15);for(let j=0;j<4;j++){const a=j*Math.PI/2+i*.3;p.rect(31+Math.cos(a)*26,39+Math.sin(a)*34,2,2,PALETTE.ivory);}});
  for(const type of['sea-wave','fire-column'])for(let i=0;i<4;i++)add(`${type}-${i}`,type==='sea-wave'?256:96,type==='sea-wave'?96:128,[0,type==='sea-wave'?40:124],'Compact animated environment strip; renderer tiles/culls and simulation controls hazards.',p=>scenery(p,type,i));
  for(const[key,w,h]of[['dungeon-arch',128,160],['tech-console',96,80],['wizard-tree',128,192],['tech-cables',128,128],['sea-rock',128,96]])add(key,w,h,[w/2,h],'Decorative theme piece; reuse/cull instead of allocating new fullscreen backgrounds.',p=>scenery(p,key));
  for(const type of['tide','pyre','neon','veil'])add(`tile-${type}`,64,64,[0,0],'World foreground surface; bright top rim distinguishes collidable terrain.',p=>{steel(p,type==='veil');const C=PALETTE,tint={tide:C.snow,pyre:C.copper,neon:C.cyan,veil:C.violet}[type];p.rect(0,0,64,4,tint);p.rect(0,4,64,2,C.ink);for(let y=16;y<57;y+=12){p.line(9,y,54,y+3,1,type==='pyre'?C.rust:type==='tide'?C.cyanDark:C.shadow);}if(type==='neon'){p.rect(18,28,28,4,C.cyanDark);p.rect(23,29,18,1,C.cyan);}if(type==='veil'){p.poly([[30,17],[43,34],[30,51],[17,34]],C.shadow);p.line(30,23,30,45,2,C.violet);}});
  if (manifest.length < 121 || new Set(manifest.map(item => item.key)).size !== manifest.length) throw new Error('Incomplete texture manifest');
  return manifest;
}
