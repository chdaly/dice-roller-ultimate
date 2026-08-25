const diceContainer = document.getElementById("diceContainer");
const rollBtn = document.getElementById("rollBtn");
const rollList = document.getElementById("rollList");
const statsEl = document.getElementById("stats");
const diceColorInput = document.getElementById("diceColor");
const diceCountSelect = document.getElementById("diceCount");
const themeToggle = document.getElementById("themeToggle");
const romanToggle = document.getElementById("romanToggle");

// Base rotation (in whole turns) needed to bring each face to the front.
const faceRotations = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 180 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: -90, y: 0 },
  6: { x: 90, y: 0 },
};

let rolling = false;
let history = [];
let dice = []; // { el, spins }
let romanMode = false;

const romanDigits = ["I", "II", "III", "IV", "V", "VI"];

// Converts any positive integer to a Roman numeral (used for multi-dice totals).
function toRoman(num) {
  const values = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let result = "";
  let remaining = num;
  for (const [value, symbol] of values) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result || "N";
}

function faceMarkup(pipSpans, numeral) {
  return `<div class="pips">${pipSpans}</div><div class="numeral">${numeral}</div>`;
}

function dieMarkup() {
  return `
    <div class="scene">
      <div class="die">
        <div class="face front">${faceMarkup("<span class=\"pip\"></span>", romanDigits[0])}</div>
        <div class="face back">${faceMarkup("<span class=\"pip\"></span><span class=\"pip\"></span>", romanDigits[1])}</div>
        <div class="face right">${faceMarkup("<span class=\"pip\"></span><span class=\"pip\"></span><span class=\"pip\"></span>", romanDigits[2])}</div>
        <div class="face left">${faceMarkup("<span class=\"pip\"></span><span class=\"pip\"></span><span class=\"pip\"></span><span class=\"pip\"></span>", romanDigits[3])}</div>
        <div class="face top">${faceMarkup("<span class=\"pip\"></span><span class=\"pip\"></span><span class=\"pip\"></span><span class=\"pip\"></span><span class=\"pip\"></span>", romanDigits[4])}</div>
        <div class="face bottom">${faceMarkup("<span class=\"pip\"></span><span class=\"pip\"></span><span class=\"pip\"></span><span class=\"pip\"></span><span class=\"pip\"></span><span class=\"pip\"></span>", romanDigits[5])}</div>
      </div>
    </div>`;
}

function buildDice(count) {
  diceContainer.innerHTML = "";
  diceContainer.insertAdjacentHTML("beforeend", dieMarkup().repeat(count));
  dice = Array.from(diceContainer.querySelectorAll(".die")).map((el) => ({
    el,
    spins: 0,
  }));
}

function renderHistory() {
  rollList.innerHTML = history
    .map((entry) => {
      if (Array.isArray(entry)) {
        const sum = entry.reduce((a, b) => a + b, 0);
        const label = romanMode ? toRoman(sum) : sum;
        return `<div class="roll-chip" title="${entry.join(" + ")}">${label}</div>`;
      }
      const label = romanMode ? toRoman(entry) : entry;
      return `<div class="roll-chip">${label}</div>`;
    })
    .join("");
  rollList.scrollTop = rollList.scrollHeight;
}

function renderStats() {
  const n = history.length;

  if (n < 5) {
    statsEl.innerHTML = `Roll ${5 - n} more time${5 - n === 1 ? "" : "s"} to see probability stats.`;
    return;
  }

  if (dice.length === 1) {
    // Probability of this exact sequence of rolls occurring, in order.
    const exactSequenceProb = Math.pow(1 / 6, n);

    // Probability of the most-repeated value appearing at least that many
    // times in n rolls (binomial), e.g. "7 rolls landing on 1".
    const counts = {};
    history.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
    let modeValue = 1;
    let modeCount = 0;
    for (const [value, count] of Object.entries(counts)) {
      if (count > modeCount) {
        modeCount = count;
        modeValue = value;
      }
    }

    const modeAtLeastProb = binomialAtLeast(modeCount, n, 1 / 6);

    statsEl.innerHTML = `
      <div>Total rolls: <strong>${n}</strong></div>
      <div>Exact sequence probability:
        <span class="prob-value">${formatProb(exactSequenceProb)}</span>
      </div>
      <div>Value <strong>${modeValue}</strong> appeared <strong>${modeCount}</strong> time${modeCount === 1 ? "" : "s"}
        &mdash; probability of that many or more:
        <span class="prob-value">${formatProb(modeAtLeastProb)}</span>
      </div>
    `;
    return;
  }

  // Multiple dice: track totals per roll instead of individual faces.
  const diceCount = dice.length;
  const sums = history.map((entry) =>
    Array.isArray(entry) ? entry.reduce((a, b) => a + b, 0) : entry
  );
  const counts = {};
  sums.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  let modeValue = sums[0];
  let modeCount = 0;
  for (const [value, count] of Object.entries(counts)) {
    if (count > modeCount) {
      modeCount = count;
      modeValue = value;
    }
  }
  const avg = (sums.reduce((a, b) => a + b, 0) / n).toFixed(2);
  const min = Math.min(...sums);
  const max = Math.max(...sums);

  statsEl.innerHTML = `
    <div>Total rolls: <strong>${n}</strong></div>
    <div>Average total: <strong>${avg}</strong> (possible range ${diceCount}&ndash;${diceCount * 6})</div>
    <div>Most common total: <strong>${modeValue}</strong> (${modeCount} time${modeCount === 1 ? "" : "s"}), min ${min}, max ${max}</div>
  `;
}

function binomialAtLeast(k, trials, p) {
  let prob = 0;
  for (let i = k; i <= trials; i++) {
    prob += combinations(trials, i) * Math.pow(p, i) * Math.pow(1 - p, trials - i);
  }
  return prob;
}

function combinations(a, b) {
  let result = 1;
  for (let i = 0; i < b; i++) {
    result = (result * (a - i)) / (i + 1);
  }
  return result;
}

function formatProb(p) {
  if (p === 0) return "0%";
  if (p < 0.0001) return `1 in ${Math.round(1 / p).toLocaleString()}`;
  return `${(p * 100).toFixed(4)}%`;
}

function rollDice() {
  if (rolling) return;
  rolling = true;
  rollBtn.disabled = true;

  const results = [];
  let completed = 0;

  dice.forEach((d) => {
    const result = Math.floor(Math.random() * 6) + 1;
    results.push(result);
    d.spins += 1;

    const extraX = 360 * (2 + Math.floor(Math.random() * 2));
    const extraY = 360 * (2 + Math.floor(Math.random() * 2));
    const target = faceRotations[result];

    const finalX = extraX * d.spins + target.x;
    const finalY = extraY * d.spins + target.y;

    d.el.classList.add("rolling");
    d.el.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg)`;

    d.el.addEventListener(
      "transitionend",
      () => {
        d.el.classList.remove("rolling");
        completed += 1;
        if (completed === dice.length) {
          rolling = false;
          rollBtn.disabled = false;
          history.push(results.length === 1 ? results[0] : results);
          renderHistory();
          renderStats();
        }
      },
      { once: true }
    );
  });
}

function getContrastColor(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#f9fafb";
}

function applyDieColor(hex) {
  document.documentElement.style.setProperty("--die-color", hex);
  document.documentElement.style.setProperty("--pip-color", getContrastColor(hex));
  localStorage.setItem("diceColor", hex);
}

function applyTheme(theme) {
  document.body.classList.toggle("light-mode", theme === "light");
  themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
  localStorage.setItem("theme", theme);
}

function resetHistory() {
  history = [];
  renderHistory();
  renderStats();
}

function applyRomanMode(enabled) {
  romanMode = enabled;
  document.body.classList.toggle("roman-mode", enabled);
  localStorage.setItem("romanMode", enabled ? "1" : "0");
  renderHistory();
}

diceColorInput.addEventListener("input", (e) => applyDieColor(e.target.value));

diceCountSelect.addEventListener("change", (e) => {
  buildDice(Number(e.target.value));
  localStorage.setItem("diceCount", e.target.value);
  resetHistory();
});

themeToggle.addEventListener("click", () => {
  const isLight = document.body.classList.contains("light-mode");
  applyTheme(isLight ? "dark" : "light");
});

romanToggle.addEventListener("change", (e) => applyRomanMode(e.target.checked));

rollBtn.addEventListener("click", rollDice);

// Restore saved preferences.
const savedColor = localStorage.getItem("diceColor") || "#f9fafb";
diceColorInput.value = savedColor;
applyDieColor(savedColor);

const savedCount = Number(localStorage.getItem("diceCount")) || 1;
diceCountSelect.value = String(savedCount);
buildDice(savedCount);

applyTheme(localStorage.getItem("theme") || "dark");

const savedRoman = localStorage.getItem("romanMode") === "1";
romanToggle.checked = savedRoman;
applyRomanMode(savedRoman);

renderStats();
