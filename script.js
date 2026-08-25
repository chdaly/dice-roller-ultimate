const die = document.getElementById("die");
const rollBtn = document.getElementById("rollBtn");

function rollDie() {
  const result = Math.floor(Math.random() * 6) + 1;
  die.textContent = result;
}

rollBtn.addEventListener("click", rollDie);
