const size = 21;
const canvasSize = 680;
const cellPx = Math.floor(canvasSize / size);
const canvas = document.getElementById("mazeCanvas");
const ctx = canvas.getContext("2d");
canvas.width = canvasSize;
canvas.height = canvasSize;
const playerGif = document.getElementById("playerGif");
const scoreEl = document.getElementById("score");
const collectedList = document.getElementById("collectedList");
const finishModal = document.getElementById("finishModal");
const finishGif = document.getElementById("finishGif");
const finishTitle = document.getElementById("finishTitle");
const finishText = document.getElementById("finishText");
const musicToggleBtn = document.getElementById("musicToggle");
const appRoot = document.getElementById("app");
const loader = document.getElementById("loader");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const timerEl = document.getElementById("timer");

const memes = ["1.gif", "2.gif", "3.gif", "4.gif", "5.gif"];
const itemDefs = [
  { name: "Казино", img: "2.gif", givesMemeIndex: 1, icon: "🎰" },
  { name: "Квартира", img: "3.gif", givesMemeIndex: 2, icon: "🏢" },
  { name: "Монетка", img: "4.gif", givesMemeIndex: 3, icon: "🪙" },
];
let grid,
  player = { x: 1, y: 1 },
  finish = { x: size - 2, y: size - 2 },
  items = [],
  collected = [],
  score = 0,
  revertTimer = null;
const bgAudio = new Audio("backSound.mp3");
bgAudio.loop = true;
bgAudio.volume = 0.45;
let musicPlaying = false;
let bgWasPlayingBeforeMeme = false;
let memeAudio = null;
let startTime = null;
let timerInterval = null;
function getSoundForMemeIndex(mi) {
  const gifName = memes[mi] || "";
  const base = gifName.replace(/\.[^/.]+$/, "");
  if (!base) return null;
  return base + ".mp3";
}
function startMemeSound(mi) {
  stopMemeSound();
  const soundFile = getSoundForMemeIndex(mi);
  if (!soundFile) return;
  memeAudio = new Audio(soundFile);
  memeAudio.loop = true;
  memeAudio.volume = 0.9;
  if (musicPlaying) {
    bgWasPlayingBeforeMeme = true;
    bgAudio.pause();
    musicPlaying = false;
    musicToggleBtn.textContent = "🔈";
    musicToggleBtn.setAttribute("aria-pressed", "false");
  } else bgWasPlayingBeforeMeme = false;
  memeAudio.play().catch(() => {});
}
function stopMemeSound() {
  if (memeAudio) {
    try {
      memeAudio.pause();
    } catch (e) {}
    memeAudio = null;
  }
  if (bgWasPlayingBeforeMeme) {
    bgAudio
      .play()
      .then(() => {
        musicPlaying = true;
        musicToggleBtn.textContent = "🔊";
        musicToggleBtn.setAttribute("aria-pressed", "true");
      })
      .catch(() => {});
    bgWasPlayingBeforeMeme = false;
  }
}
function tryPlayBackground() {
  if (musicPlaying) return;
  const p = bgAudio.play();
  if (p !== undefined) {
    p.then(() => {
      musicPlaying = true;
      musicToggleBtn.textContent = "🔊";
      musicToggleBtn.setAttribute("aria-pressed", "true");
    }).catch(() => attachFirstGestureForMusic());
  } else attachFirstGestureForMusic();
}
function attachFirstGestureForMusic() {
  const startHandler = () => {
    bgAudio
      .play()
      .then(() => {
        musicPlaying = true;
        musicToggleBtn.textContent = "🔊";
        musicToggleBtn.setAttribute("aria-pressed", "true");
      })
      .catch(() => {})
      .finally(() => {
        window.removeEventListener("keydown", startHandler);
        canvas.removeEventListener("click", startHandler);
      });
  };
  window.addEventListener("keydown", startHandler, { once: true });
  canvas.addEventListener("click", startHandler, { once: true });
}
musicToggleBtn.addEventListener("click", () => {
  if (musicPlaying) {
    bgAudio.pause();
    musicPlaying = false;
    musicToggleBtn.textContent = "🔈";
    musicToggleBtn.setAttribute("aria-pressed", "false");
  } else {
    bgAudio
      .play()
      .then(() => {
        musicPlaying = true;
        musicToggleBtn.textContent = "🔊";
        musicToggleBtn.setAttribute("aria-pressed", "true");
      })
      .catch(() => {});
  }
});
function preloadAssets(list, onProgress) {
  const total = list.length;
  let loaded = 0;
  return new Promise((resolve) => {
    if (total === 0) {
      onProgress(1);
      resolve();
      return;
    }
    list.forEach((src) => {
      if (typeof src !== "string") {
        increment();
        return;
      }
      const ext = (src.split(".").pop() || "").toLowerCase();
      if (
        ext === "png" ||
        ext === "jpg" ||
        ext === "jpeg" ||
        ext === "gif" ||
        ext === "webp"
      ) {
        const img = new Image();
        img.onload = increment;
        img.onerror = increment;
        img.src = src;
      } else if (ext === "mp3" || ext === "wav" || ext === "ogg") {
        const audio = new Audio();
        const handler = () => {
          audio.removeEventListener("canplaythrough", handler);
          audio.removeEventListener("error", handler);
          increment();
        };
        audio.addEventListener("canplaythrough", handler);
        audio.addEventListener("error", handler);
        audio.preload = "auto";
        audio.src = src;
      } else {
        increment();
      }
    });
    function increment() {
      loaded++;
      onProgress(loaded / total);
      if (loaded >= total) resolve();
    }
  });
}
function buildAssetList() {
  const list = [];
  memes.forEach((m) => list.push(m));
  itemDefs.forEach((i) => list.push(i.img));
  list.push("6.gif");
  list.push("backSound.mp3");
  memes.forEach((m) => {
    const base = m.replace(/\.[^/.]+$/, "");
    if (base !== "1") list.push(base + ".mp3");
  });
  const dedup = [...new Set(list)];
  return dedup;
}
function setProgress(ratio) {
  const pct = Math.round(ratio * 100);
  progressBar.style.width = pct + "%";
  progressText.textContent = pct + "%";
  loader.setAttribute("aria-valuenow", String(pct));
}
function hideLoader() {
  loader.classList.add("hidden");
  appRoot.removeAttribute("aria-hidden");
}
function initAfterLoad() {
  newMaze();
  tryPlayBackground();
}
function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
}
function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}
function updateTimer() {
  if (!startTime) return;
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;
  timerEl.textContent = `Время: ${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
const assets = buildAssetList();
preloadAssets(assets, setProgress).then(() => {
  setTimeout(() => {
    hideLoader();
    initAfterLoad();
  }, 250);
});
function newMaze() {
  grid = Array.from({ length: size }, () => Array(size).fill(1));
  for (let y = 1; y < size; y += 2)
    for (let x = 1; x < size; x += 2) grid[y][x] = 0;
  const stack = [];
  const start = { x: 1, y: 1 };
  const visitedCells = new Set();
  function key(c) {
    return c.x + "," + c.y;
  }
  stack.push(start);
  visitedCells.add(key(start));
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const directions = [
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
    ];
    const neigh = directions.map((d) => ({ x: cur.x + d.dx, y: cur.y + d.dy }));
    const viable = neigh.filter(
      (n) =>
        n.x > 0 &&
        n.x < size &&
        n.y > 0 &&
        n.y < size &&
        !visitedCells.has(key(n))
    );
    if (viable.length) {
      const nxt = viable[Math.floor(Math.random() * viable.length)];
      const wx = cur.x + (nxt.x - cur.x) / 2;
      const wy = cur.y + (nxt.y - cur.y) / 2;
      grid[wy][wx] = 0;
      visitedCells.add(key(nxt));
      stack.push(nxt);
    } else stack.pop();
  }
  player = { x: 1, y: 1 };
  finish = { x: size - 2, y: size - 2 };
  items = [];
  const available = [];
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++)
      if (
        grid[y][x] === 0 &&
        !(x === player.x && y === player.y) &&
        !(x === finish.x && y === finish.y)
      )
        available.push({ x, y });
  shuffleArray(available);
  for (let i = 0; i < Math.min(itemDefs.length, available.length); i++) {
    const a = available[i];
    items.push({ x: a.x, y: a.y, def: itemDefs[i], got: false });
  }
  collected = [];
  score = 0;
  collectedList.innerHTML = "";
  if (revertTimer) {
    clearTimeout(revertTimer);
    revertTimer = null;
  }
  stopMemeSound();
  playerGif.src = memes[0];
  updateHUD();
  render();
  updatePlayerGifPosition();
  startTimer();
}
function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
function render() {
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.fillStyle = "#071428";
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = x * cellPx;
      const py = y * cellPx;
      if (grid[y][x] === 1) {
        ctx.fillStyle = "#0b2036";
        ctx.fillRect(px, py, cellPx, cellPx);
      } else {
        ctx.fillStyle = "#071a2a";
        ctx.fillRect(px, py, cellPx, cellPx);
      }
    }
  ctx.strokeStyle = "rgba(10,20,30,0.7)";
  ctx.lineWidth = Math.max(1, cellPx * 0.06);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (grid[y][x] === 1) {
        const px = x * cellPx;
        const py = y * cellPx;
        const r = Math.max(1, Math.floor(cellPx * 0.08));
        ctx.fillStyle = "#08283a";
        roundRect(ctx, px + 1, py + 1, cellPx - 2, cellPx - 2, r, true, false);
      }
  for (const it of items)
    if (!it.got) {
      const cx = it.x * cellPx + cellPx / 2;
      const cy = it.y * cellPx + cellPx / 2;
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = "#ffd166";
      ctx.arc(cx, cy, Math.max(6, cellPx * 0.14), 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
      ctx.restore();
      const icon = it.def.icon || "★";
      ctx.font = `${Math.max(
        14,
        Math.floor(cellPx * 0.44)
      )}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#132b3f";
      ctx.fillText(icon, cx, cy + 1);
    }
  const fx = finish.x * cellPx + cellPx / 2;
  const fy = finish.y * cellPx + cellPx / 2;
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = "rgba(125,220,255,0.08)";
  ctx.arc(fx, fy, Math.max(8, cellPx * 0.22), 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
  ctx.restore();
  const px = player.x * cellPx + cellPx / 2;
  const py = player.y * cellPx + cellPx / 2;
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.arc(px, py, Math.max(3, cellPx * 0.08), 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (typeof stroke === "undefined") stroke = true;
  if (typeof r === "undefined") r = 5;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
function canMoveTo(nx, ny) {
  if (nx < 0 || ny < 0 || nx >= size || ny >= size) return false;
  return grid[ny][nx] !== 1;
}
function movePlayer(dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;
  if (!canMoveTo(nx, ny)) return false;
  player.x = nx;
  player.y = ny;
  updatePlayerGifPosition();
  render();
  checkItemPickup();
  checkFinish();
  return true;
}
function updatePlayerGifPosition() {
  const x = player.x * cellPx + cellPx / 2;
  const y = player.y * cellPx + cellPx / 2;
  playerGif.style.left = `${x}px`;
  playerGif.style.top = `${y}px`;
}
function checkItemPickup() {
  for (const it of items) {
    if (it.got) continue;
    if (it.x === player.x && it.y === player.y) {
      it.got = true;
      collected.push(it.def);
      score++;
      updateHUD();
      const mi = it.def.givesMemeIndex;
      if (revertTimer) {
        clearTimeout(revertTimer);
        revertTimer = null;
      }
      stopMemeSound();
      playerGif.style.transform = "translate(-50%,-50%) scale(1.05)";
      setTimeout(
        () => (playerGif.style.transform = "translate(-50%,-50%) scale(1)"),
        160
      );
      if (memes[mi]) playerGif.src = memes[mi];
      startMemeSound(mi);
      if (mi === 1 || mi === 2 || mi === 3) {
        revertTimer = setTimeout(() => {
          stopMemeSound();
          playerGif.src = memes[0];
          revertTimer = null;
        }, 5000);
      }
      const img = document.createElement("img");
      img.src = it.def.img;
      img.title = it.def.name;
      img.className = "itemThumb";
      collectedList.appendChild(img);
      render();
    }
  }
}
function updateHUD() {
  scoreEl.textContent = `Собрано: ${score}`;
}
function checkFinish() {
  if (player.x === finish.x && player.y === finish.y) {
    stopTimer();
    if (revertTimer) {
      clearTimeout(revertTimer);
      revertTimer = null;
    }
    stopMemeSound();
    finishGif.src = "6.gif";
    finishTitle.textContent = "Финиш!";
    finishText.textContent = `Ты дошёл до конца! Собрано предметов: ${score}.`;
    if (startTime) {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      document.getElementById(
        "finishTime"
      ).textContent = `Время прохождения: ${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;
    } else {
      document.getElementById("finishTime").textContent = "";
    }
    openModal();
  }
}
function openModal() {
  finishModal.classList.add("open");
  finishModal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  finishModal.classList.remove("open");
  finishModal.setAttribute("aria-hidden", "true");
}
document.getElementById("playAgain").addEventListener("click", () => {
  closeModal();
  newMaze();
});
document
  .getElementById("closeModal")
  .addEventListener("click", () => closeModal());
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const key = e.key.toLowerCase();
  let moved = false;
  const upSet = ["w", "ц", "arrowup"];
  const downSet = ["s", "ы", "arrowdown"];
  const leftSet = ["a", "ф", "arrowleft"];
  const rightSet = ["d", "в", "arrowright"];
  if (upSet.includes(key)) moved = movePlayer(0, -1);
  if (downSet.includes(key)) moved = movePlayer(0, 1);
  if (leftSet.includes(key)) moved = movePlayer(-1, 0);
  if (rightSet.includes(key)) moved = movePlayer(1, 0);
  if (moved) e.preventDefault();
});
canvas.addEventListener("click", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const cx = ev.clientX - rect.left;
  const cy = ev.clientY - rect.top;
  const px = player.x * cellPx + cellPx / 2;
  const py = player.y * cellPx + cellPx / 2;
  const dx = cx - px;
  const dy = cy - py;
  if (Math.abs(dx) > Math.abs(dy)) movePlayer(dx > 0 ? 1 : -1, 0);
  else movePlayer(0, dy > 0 ? 1 : -1);
});
document.getElementById("regenBtn").addEventListener("click", () => newMaze());
window.addEventListener("resize", updatePlayerGifPosition);
setTimeout(updatePlayerGifPosition, 50);
finishModal.addEventListener("click", (e) => {
  if (e.target === finishModal) closeModal();
});
function preloadUrls(urls) {
  for (const u of urls) {
    const img = new Image();
    img.src = u;
  }
}
preloadUrls(memes.concat(itemDefs.map((i) => i.img)).concat(["6.gif"]));
