let hrChart, stepsChart, sleepChart;

async function fetchSeries() {
  const res = await fetch('/api/track/series');
  const data = await res.json();
  return data.series || [];
}

function toTimeLabel(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString();
}

function buildCharts(series) {
  const labels = series.map(d => toTimeLabel(d.ts));
  const hr = series.map(d => d.heart_rate || 0);
  const steps = series.map(d => d.steps || 0);
  const sleep = series.map(d => d.sleep_hours || 0);

  const hrCtx = document.getElementById('chart-hr');
  const stepsCtx = document.getElementById('chart-steps');
  const sleepCtx = document.getElementById('chart-sleep');

  if (hrChart) hrChart.destroy();
  if (stepsChart) stepsChart.destroy();
  if (sleepChart) sleepChart.destroy();

  hrChart = new Chart(hrCtx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Heart Rate (bpm)', data: hr, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.2)', fill: true }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } } }
  });

  stepsChart = new Chart(stepsCtx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Steps', data: steps, backgroundColor: '#38bdf8' }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });

  const sleepTotal = sleep.reduce((a,b)=>a+b,0) || 1;
  const sleepDist = [
    Math.max(0, sleepTotal * 0.15), // REM
    Math.max(0, sleepTotal * 0.50), // Light
    Math.max(0, sleepTotal * 0.35)  // Deep
  ];
  sleepChart = new Chart(sleepCtx, {
    type: 'pie',
    data: { labels: ['REM','Light','Deep'], datasets: [{ data: sleepDist, backgroundColor: ['#2563eb','#38bdf8','#93c5fd'] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

async function refreshCharts() {
  const series = await fetchSeries();
  buildCharts(series);
}

document.querySelector('#save-track').addEventListener('click', async () => {
  await fetch('/api/track/sample', { method: 'POST' });
  await refreshCharts();
});

// initial load
refreshCharts();


