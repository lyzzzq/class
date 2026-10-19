// =====================================================================
//  《无限镜屋 · Infinity Room》— 完成版 / finished
//  PART A：身体姿态引擎 / pose engine · PART B：作品 / artwork
//  5 个 ===== 标记的函数就是 5 个步骤的答案 / the 5 functions marked ===== are the answers to the 5 steps
// =====================================================================


// ---------------------------------------------------------------------
//  PART A — 身体姿态引擎（三个项目完全相同，不要修改）
//  PART A — body pose engine (identical in all three projects, don't change it)
// ---------------------------------------------------------------------
const MP_VERSION = "0.10.21";
// MediaPipe 的两个下载来源：先用国内镜像 npmmirror，失败再用 jsDelivr
const MP_URLS = [
  `https://registry.npmmirror.com/@mediapipe/tasks-vision/${MP_VERSION}/files`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`,
];
// 姿态模型：先找项目文件夹里的 pose_landmarker_lite.task，没有再从 Google 下载
const MODEL_URLS = [
  "pose_landmarker_lite.task",
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
];

// 常用的身体关键点编号（一共 33 个点）。画面是镜像的：你的左手显示在画面左边。
// Body landmark numbers (33 in total). The picture is mirrored: your left hand is on the left of the screen.
const BODY = {
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13, R_ELBOW: 14,
  L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25, R_KNEE: 26,
  L_ANKLE: 27, R_ANKLE: 28,
};

let video;                 // 摄像头画面 / the webcam
let poseLandmarker = null; // MediaPipe 姿态模型 / the pose model
let poses = [];            // 每一帧：看到的所有人（最多 2 个）。每个人 = 33 个点 {x, y, z, visibility}
                           // every frame: the people the camera sees (max 2); each = 33 points {x, y, z, visibility}
                           // x、y 是画布像素坐标（已经镜像）/ x, y are canvas pixels (already mirrored)
let lastVideoTime = -1;
let started = false;
let showCamera = false;
let showSkeleton = false;

async function loadPoseLandmarker() {
  setStatus("正在加载姿态模型… / Loading the pose model…");
  for (const base of MP_URLS) {
    let vision, fileset;
    try {
      vision = await import(`${base}/vision_bundle.mjs`);
      fileset = await vision.FilesetResolver.forVisionTasks(`${base}/wasm`);
    } catch (e) {
      continue;
    }
    for (const model of MODEL_URLS) {
      for (const delegate of ["GPU", "CPU"]) {
        try {
          poseLandmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: model, delegate },
            runningMode: "VIDEO",
            numPoses: 2,
          });
          return;
        } catch (e) {
          // 失败就试下一个 / try the next one
        }
      }
    }
  }
  setStatus("⚠️ 姿态模型加载失败：请把 pose_landmarker_lite.task 放进项目文件夹 / Pose model failed to load: put pose_landmarker_lite.task in the project folder");
}

// 每一帧调用一次 / call once per frame
let cameraOk = null;
function updatePoses() {
  if (!poseLandmarker || !video) return;
  const ok = video.elt.readyState >= 2;
  if (ok !== cameraOk) {
    cameraOk = ok;
    setStatus(ok ? "退后一点，让摄像头看到你的上半身 🧍 / Step back so the camera sees your upper body"
                 : "正在等待摄像头… / Waiting for the camera…");
  }
  if (!ok) return;
  if (video.elt.currentTime === lastVideoTime) return;
  lastVideoTime = video.elt.currentTime;

  const result = poseLandmarker.detectForVideo(video.elt, performance.now());
  poses = result.landmarks.map((pts) =>
    pts.map((p) => ({ x: (1 - p.x) * width, y: p.y * height, z: p.z, visibility: p.visibility === undefined ? 1 : p.visibility }))
  );
}

// 这个点看得清楚吗？/ is this point clearly visible?
function isVisible(p) {
  return p && p.visibility > 0.5 && p.x > -50 && p.x < width + 50 && p.y > -50 && p.y < height + 50;
}

// 画出细细的骨架（学习和调试用，按 K 显示/隐藏）/ thin skeleton for learning and debugging (key K)
const SKELETON = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
function drawSkeleton() {
  push();
  for (const pose of poses) {
    stroke(255, 255, 0, 200);
    strokeWeight(2);
    for (const [a, b] of SKELETON) {
      if (isVisible(pose[a]) && isVisible(pose[b])) line(pose[a].x, pose[a].y, pose[b].x, pose[b].y);
    }
    noStroke();
    fill(255, 80, 80);
    for (const i of Object.values(BODY)) if (isVisible(pose[i])) circle(pose[i].x, pose[i].y, 8);
  }
  pop();
}

function drawCamera() {
  push();
  translate(width, 0);
  scale(-1, 1);
  tint(255, 90);
  image(video, 0, 0, width, height);
  pop();
}

function setStatus(msg) {
  select("#status").html(msg);
}


// ---------------------------------------------------------------------
//  PART B — 作品：《无限镜屋》（致敬草间弥生）
//  PART B — artwork: "Infinity Mirror Room" (after Yayoi Kusama)
// ---------------------------------------------------------------------

// 三个房间：颜色（每种是 0~1 的 RGB）和音乐盒的和弦（MIDI）
// three rooms: colors (RGB 0–1) and the music box chord (MIDI)
const ROOMS = [
  { name: "百万光年的灵魂 / Souls of Millions of Light Years", cols: [[1.0, 0.35, 0.55], [0.3, 0.6, 1.0], [1.0, 0.85, 0.3]], chord: [72, 76, 79, 83, 86] },
  { name: "南瓜 / Pumpkin", cols: [[1.0, 0.8, 0.1], [1.0, 0.55, 0.05], [0.95, 0.95, 0.85]], chord: [69, 72, 76, 79, 84] },
  { name: "永恒的爱 / Love Forever", cols: [[1.0, 0.2, 0.35], [1.0, 0.55, 0.78], [1.0, 1.0, 1.0]], chord: [74, 77, 81, 84, 88] },
];
const BODY_IDS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27]; // 12 个发光的身体点 / 12 glowing body points
const ARP = [0, 1, 2, 3, 4, 3, 2, 1];                              // 音乐盒的顺序 / music box pattern

let room = 0;
let cols = ROOMS[0].cols.map((c) => [...c]); // 现在的颜色（慢慢变向目标）/ current colors (fade towards the target)
let zoom = 1;
let energy = 0;        // 身体动得多快（0~1）/ how much the body moves (0–1)
let prevBody = null;
let roomShader = null;
let shaderError = "";

// 声音 / sound
let bus, delay, reverb;
let box = [];          // 音乐盒声部 / music box voices
let nextBox = 0;
let drone = [];        // 低沉温暖的长音 / warm low drone
let musicLoop;
let forcedRoom = -1, forcedUntil = 0; // 键盘选的房间（4 秒内优先）/ room picked with the keyboard (wins for 4 s)
let step = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  makeShader();
  select("#start").mouseClicked(startExperience);
}

// 把 3 个 GLSL 小函数拼成完整的着色器 / put the 3 small GLSL functions together into the full shader
function makeShader() {
  const src = `precision highp float;
varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform float uTime;
uniform float uAspect;
uniform float uZoom;
uniform float uEnergy;
uniform vec2 uBody[12];
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;

${glslHash()}

${glslLight()}

${glslBodyGlow()}

void main() {
  vec2 uv = vTexCoord;
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
  float glow = bodyGlow(uv);
  vec3 col = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    float depth = float(i);
    vec2 q = p * uZoom * pow(1.7, depth) * 6.0 + vec2(depth * 3.1, depth * 1.7);
    vec2 cell = floor(q);
    vec2 f = fract(q) - 0.5;
    float h = hash(cell + depth * 17.0);
    vec2 offset = vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
    float r = (0.12 + 0.18 * h) * (1.0 + glow * 0.5);
    float twinkle = 0.6 + 0.4 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
    float l = light(f - offset * 0.5, vec2(0.0), r) * twinkle;
    vec3 c = h < 0.33 ? uColA : (h < 0.66 ? uColB : uColC);
    float fade = 1.0 / (1.0 + depth * 0.9);
    col += c * l * fade * (0.6 + glow * 2.5 + uEnergy);
  }
  col += vec3(1.0, 0.9, 0.95) * glow * 0.25;
  gl_FragColor = vec4(col, 1.0);
}`;
  shaderError = glslError(src);
  roomShader = shaderError ? null : createFilterShader(src);
  if (shaderError) setStatus("⚠️ GLSL: " + shaderError);
}

function startExperience() {
  userStartAudio();
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // 声音链：音乐盒 → 低通 → 回声 → 混响 / chain: music box → low-pass → echo → reverb
  bus = new p5.LowPass();
  bus.freq(3500);
  bus.disconnect();
  delay = new p5.Delay();
  delay.process(bus, 0.375, 0.35, 2300);
  delay.drywet(0.35);
  delay.disconnect();
  reverb = new p5.Reverb();
  reverb.process(delay, 4, 2);
  reverb.drywet(0.35);

  for (let i = 0; i < 6; i++) {
    const osc = new p5.Oscillator("sine");
    osc.disconnect();
    osc.connect(bus);
    osc.amp(0);
    osc.start();
    const env = new p5.Envelope();
    env.setADSR(0.002, 0.9, 0, 0.3);
    env.setRange(0.12, 0);
    box.push({ osc, env });
  }
  for (const m of [48, 55]) {
    const osc = new p5.Oscillator("sine");
    osc.disconnect();
    osc.connect(bus);
    osc.freq(midiToFreq(m));
    osc.amp(0.02, 3);
    osc.start();
    drone.push(osc);
  }
  musicLoop = new p5.SoundLoop(onTick, 60 / 96 / 2);
  musicLoop.start();

  select("#intro").hide();
  started = true;
  loadPoseLandmarker();
}

function draw() {
  background(0);
  const pose = poses[0];
  if (started) {
    updatePoses();
    // 1. 身体动得多快 / how fast the body moves
    const body = bodyUniform(pose);
    let move = 0;
    if (prevBody && pose) {
      for (let i = 0; i < 24; i += 2) {
        if (body[i] > -1 && prevBody[i] > -1) move += dist(body[i], body[i + 1], prevBody[i], prevBody[i + 1]);
      }
    }
    prevBody = body;
    energy = lerp(energy, constrain(move * 8, 0, 1), 0.1);
    // 2. 选房间，颜色慢慢变过去 / choose the room, colors fade over
    room = millis() < forcedUntil ? forcedRoom : pickRoom(pose);
    for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) cols[k][c] = lerp(cols[k][c], ROOMS[room].cols[k][c], 0.05);
    // 3. 张开双臂，房间变大 / open your arms and the room grows
    let target = 1;
    if (pose && isVisible(pose[15]) && isVisible(pose[16]) && isVisible(pose[11]) && isVisible(pose[12])) {
      const spread = dist(pose[15].x, pose[15].y, pose[16].x, pose[16].y) / max(dist(pose[11].x, pose[11].y, pose[12].x, pose[12].y), 1);
      target = map(spread, 1, 4, 1.3, 0.7, true);
    }
    zoom = lerp(zoom, target, 0.05);
    if (roomShader) {
      roomShader.setUniform("uBody", body);
    }
  }

  // 4. 着色器画出整个房间 / the shader paints the whole room
  if (roomShader) {
    if (!started) roomShader.setUniform("uBody", new Array(24).fill(-10));
    roomShader.setUniform("uTime", millis() / 1000);
    roomShader.setUniform("uAspect", width / height);
    roomShader.setUniform("uZoom", zoom);
    roomShader.setUniform("uEnergy", energy);
    roomShader.setUniform("uColA", cols[0]);
    roomShader.setUniform("uColB", cols[1]);
    roomShader.setUniform("uColC", cols[2]);
    filter(roomShader);
  }
  if (started) {
    if (showCamera) drawCamera();
    if (showSkeleton) drawSkeleton();
    noStroke();
    fill(255, 200);
    textSize(16);
    textAlign(RIGHT, TOP);
    text(ROOMS[room].name, width - 16, 14);
  }
}

// ===== 第 1 步 / STEP 1：glslHash（完成版 / finished）=====
// GLSL：一个“随机数”函数。同一个格子永远得到同一个 0~1 的数
function glslHash() {
  return `float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}`;
}
// ===== 第 1 步 结束 / STEP 1 END =====

// ===== 第 2 步 / STEP 2：glslLight（完成版 / finished）=====
// GLSL：一盏柔和的小灯：中间亮、边缘软，外面还有一圈淡淡的光晕
function glslLight() {
  return `float light(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  float core = smoothstep(r, r * 0.6, d);
  float halo = exp(-d * d / (r * r) * 2.0) * 0.4;
  return core + halo;
}`;
}
// ===== 第 2 步 结束 / STEP 2 END =====

// ===== 第 3 步 / STEP 3：glslBodyGlow（完成版 / finished）=====
// GLSL：身体附近的光：离 12 个身体点越近，值越大（最大 1）
function glslBodyGlow() {
  return `float bodyGlow(vec2 uv) {
  float g = 0.0;
  for (int i = 0; i < 12; i++) {
    float d = length((uv - uBody[i]) * vec2(uAspect, 1.0));
    g += exp(-d * d * 80.0);
  }
  return min(g, 1.0);
}`;
}
// ===== 第 3 步 结束 / STEP 3 END =====

// ===== 第 4 步 / STEP 4：bodyUniform（完成版 / finished）=====
// 把 12 个身体点变成 24 个 0~1 的数字，交给着色器；看不清的点放到很远的地方（-10）
function bodyUniform(pose) {
  const out = [];
  for (const i of BODY_IDS) {
    const p = pose ? pose[i] : null;
    if (p && isVisible(p)) out.push(p.x / width, p.y / height);
    else out.push(-10, -10);
  }
  return out;
}
// ===== 第 4 步 结束 / STEP 4 END =====

// ===== 第 5 步 / STEP 5：pickRoom（完成版 / finished）=====
// 用姿势选房间：双手举过头顶 = 1（南瓜），双臂张得很开 = 2（永恒的爱），其他 = 0
function pickRoom(pose) {
  if (!pose) return 0;
  const nose = pose[0], lw = pose[15], rw = pose[16], ls = pose[11], rs = pose[12];
  if (!isVisible(nose) || !isVisible(lw) || !isVisible(rw) || !isVisible(ls) || !isVisible(rs)) return 0;
  if (lw.y < nose.y && rw.y < nose.y) return 1;
  const shoulders = dist(ls.x, ls.y, rs.x, rs.y);
  if (dist(lw.x, lw.y, rw.x, rw.y) > shoulders * 2.2) return 2;
  return 0;
}
// ===== 第 5 步 结束 / STEP 5 END =====

// ---------- 下面这些已经写好了，不需要改 / already written, no need to change ----------

// 音乐盒：每个八分音符弹一个音；动得越多，越响 / music box: one note per eighth note; louder when you move
function onTick(timeFromNow) {
  const chord = ROOMS[room].chord;
  const note = chord[ARP[step % ARP.length]] + (step % 16 >= 8 ? 12 : 0);
  step++;
  const v = box[nextBox];
  nextBox = (nextBox + 1) % box.length;
  v.osc.freq(midiToFreq(note), 0, timeFromNow);
  v.env.setRange(0.04 + energy * 0.14, 0);
  v.env.play(v.osc, timeFromNow);
}

// 用浏览器检查 GLSL 有没有错误 / ask the browser whether the GLSL has an error
function glslError(src) {
  const gl = document.createElement("canvas").getContext("webgl");
  if (!gl) return "";
  const s = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? "" : (gl.getShaderInfoLog(s) || "compile error").split("\n")[0];
}

function keyPressed() {
  if (key >= "1" && key <= "3") { // 用键盘试试三个房间 / try the rooms with the keyboard
    forcedRoom = int(key) - 1;
    forcedUntil = millis() + 4000;
    room = forcedRoom;
  }
  if (key === "s" || key === "S") saveCanvas("my-infinity-room", "png");
  if (key === "v" || key === "V") showCamera = !showCamera;
  if (key === "k" || key === "K") showSkeleton = !showSkeleton;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
