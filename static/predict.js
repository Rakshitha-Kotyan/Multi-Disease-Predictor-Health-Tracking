const $ = (s) => document.querySelector(s);

let ALL_SYMPTOMS = [];
let SELECTED = new Set();
async function loadSymptoms() {
  const res = await fetch('/api/symptoms');
  const data = await res.json();
  ALL_SYMPTOMS = data.symptoms || [];
  renderChips();
}

loadSymptoms();

// Chips UI
function renderChips() {
  const chips = document.querySelector('#chips');
  chips.innerHTML = '';
  Array.from(SELECTED).forEach(sym => {
    const span = document.createElement('span');
    span.className = 'chip';
    span.innerHTML = `${sym} <button aria-label="remove">×</button>`;
    span.querySelector('button').addEventListener('click', () => {
      SELECTED.delete(sym);
      renderChips();
    });
    chips.appendChild(span);
  });
}

// Suggestions dropdown
const inputEl = document.querySelector('#symptom-search');
const sugBox = document.querySelector('#suggestions');

function updateSuggestions() {
  const q = inputEl.value.toLowerCase().trim();
  if (!q) { sugBox.style.display = 'none'; sugBox.innerHTML = ''; return; }
  const options = ALL_SYMPTOMS
    .filter(s => s.toLowerCase().includes(q) && !SELECTED.has(s))
    .slice(0, 20);
  if (!options.length) { sugBox.style.display = 'none'; sugBox.innerHTML = ''; return; }
  sugBox.innerHTML = options.map(s => `<div data-sym="${s}">${s}</div>`).join('');
  sugBox.style.display = 'block';
}

inputEl.addEventListener('input', updateSuggestions);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const q = inputEl.value.trim();
    if (q) {
      // find closest match
      const match = ALL_SYMPTOMS.find(s => s.toLowerCase() === q.toLowerCase()) || ALL_SYMPTOMS.find(s => s.toLowerCase().includes(q.toLowerCase()));
      if (match && !SELECTED.has(match)) {
        SELECTED.add(match);
        renderChips();
      }
    }
    inputEl.value = '';
    updateSuggestions();
  }
});

sugBox.addEventListener('click', (e) => {
  const sym = e.target.getAttribute('data-sym');
  if (!sym) return;
  SELECTED.add(sym);
  renderChips();
  inputEl.value = '';
  updateSuggestions();
});

$('#predict-btn').addEventListener('click', async () => {
  const selected = Array.from(SELECTED);
  const topk = parseInt($('#topk').value || '3', 10);
  if (!selected.length) { alert('Please select at least one symptom'); return; }
  const res = await fetch('/api/predict', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms: selected, top_k: topk })
  });
  const data = await res.json();
  renderResults(data.predictions || []);
});

function renderResults(items) {
  const box = document.querySelector('#results');
  box.innerHTML = '';
  if (!items.length) { box.textContent = 'No results'; return; }
  items.forEach(p => {
    const div = document.createElement('div');
    div.className = 'prediction';
    div.innerHTML = `
      <h3>${p.disease} <small>${(p.confidence * 100).toFixed(2)}%</small></h3>
      <p>${p.description}</p>
      ${p.precautions && p.precautions.length ? `<b>Precautions</b><ul>${p.precautions.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    `;
    box.appendChild(div);
  });
}


