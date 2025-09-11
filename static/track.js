document.querySelector('#save-track').addEventListener('click', async () => {
  const payload = {
    heart_rate: parseFloat(document.querySelector('#hr').value || '0'),
    steps: parseInt(document.querySelector('#steps').value || '0', 10),
    sleep_hours: parseFloat(document.querySelector('#sleep').value || '0')
  };
  const res = await fetch('/api/track', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  document.querySelector('#track-output').textContent = JSON.stringify(data, null, 2);
});


