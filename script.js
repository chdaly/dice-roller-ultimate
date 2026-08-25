const die = document.getElementById("die");
const rollBtn = document.getElementById("rollBtn");
const rollList = document.getElementById("rollList");
const statsEl = document.getElementById("stats");

// Base rotation (in whole turns) needed to bring each face to the front.
const faceRotations = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 180 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: -90, y: 0 },
  6: { x: 90, y: 0 },
};

let spins = 0;
let rolling = false;
const history = [];

function renderHistory() {
  rollList.innerHTML = history
    .map((n) => `<div class="roll-chip">${n}</div>`)
    .join("");
  rollList.scrollTop = rollList.scrollHeight;
}

function renderStats() {
  const n = history.length;

  if (n < 5) {
    statsEl.innerHTML = `Roll ${5 - n} more time${5 - n === 1 ? "" : "s"} to see probability stats.`;
    return;
  }

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
}

function formatProb(p) {
  if (p === 0) return "0%";
  if (p < 0.0001) return `1 in ${Math.round(1 / p).toLocaleString()}`;
  return `${(p * 100).toFixed(4)}%`;
}

function rollDie() {
  if (rolling) return;
  rolling = true;
  rollBtn.disabled = true;

  const result = Math.floor(Math.random() * 6) + 1;
  spins += 1;

  const extraX = 360 * (2 + Math.floor(Math.random() * 2));
  const extraY = 360 * (2 + Math.floor(Math.random() * 2));
  const target = faceRotations[result];

  const finalX = extraX * spins + target.x;
  const finalY = extraY * spins + target.y;

  die.classList.add("rolling");
  die.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg)`;

  die.addEventListener(
    "transitionend",
    () => {
      rolling = false;
      rollBtn.disabled = false;
      die.classList.remove("rolling");
      history.push(result);
      renderHistory();
      renderStats();
    },
    { once: true }
  );
}

rollBtn.addEventListener("click", rollDie);
renderStats();
