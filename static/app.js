const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Tabs
$$('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`#tab-${tab}`).classList.add('active');
  });
});

// Load symptoms
async function loadSymptoms() {
  const res = await fetch('/api/symptoms');
  const data = await res.json();
  const select = $('#symptom-select');
  select.innerHTML = '';
  data.symptoms.forEach(sym => {
    const opt = document.createElement('option');
    opt.value = sym; opt.textContent = sym;
    select.appendChild(opt);
  });
}
loadSymptoms();

// Predict
$('#predict-btn').addEventListener('click', async () => {
  const selected = Array.from($('#symptom-select').selectedOptions).map(o => o.value);
  const topk = parseInt($('#topk').value || '3', 10);
  if (!selected.length) {
    alert('Please select at least one symptom');
    return;
  }
  const res = await fetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms: selected, top_k: topk })
  });
  const data = await res.json();
  renderResults(data.predictions || []);
});

function renderResults(predictions) {
  const box = $('#results');
  box.innerHTML = '';
  if (!predictions.length) { box.textContent = 'No results'; return; }
  predictions.forEach((p) => {
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

// Tracking
$('#save-track').addEventListener('click', async () => {
  const payload = {
    heart_rate: parseFloat($('#hr').value || '0'),
    steps: parseInt($('#steps').value || '0', 10),
    sleep_hours: parseFloat($('#sleep').value || '0')
  };
  const res = await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  $('#track-output').textContent = JSON.stringify(data, null, 2);
});



