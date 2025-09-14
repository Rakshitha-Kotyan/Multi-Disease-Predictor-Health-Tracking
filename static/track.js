const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// Chart instances
let hrChart, stepsChart, sleepChart;
let healthData = [];

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', function() {
  initializeCharts();
  loadHealthData();
  setupEventListeners();
});

function setupEventListeners() {
  // Save data button
  const saveBtn = $('#save-track');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveHealthData);
  }

  // Generate sample data button
  const generateBtn = $('#generate-sample');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateSampleData);
  }

  // Chart period selectors
  $$('.chart-controls select').forEach(select => {
    select.addEventListener('change', updateCharts);
  });
}

async function loadHealthData() {
  try {
    const response = await fetch('/api/track/series');
    const data = await response.json();
    healthData = data.series || [];
    updateCharts();
    updateInsights();
  } catch (error) {
    console.error('Error loading health data:', error);
  }
}

async function saveHealthData() {
  const hr = parseFloat($('#hr').value) || 0;
  const steps = parseInt($('#steps').value) || 0;
  const sleep = parseFloat($('#sleep').value) || 0;

  if (hr === 0 && steps === 0 && sleep === 0) {
    showNotification('Please enter at least one health metric', 'warning');
    return;
  }

  const payload = {
    heart_rate: hr,
    steps: steps,
    sleep_hours: sleep,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      showNotification('Health data saved successfully!', 'success');
      // Clear form
      $('#hr').value = '';
      $('#steps').value = '';
      $('#sleep').value = '';
      // Reload data
      await loadHealthData();
    } else {
      showNotification('Error saving health data', 'error');
    }
  } catch (error) {
    console.error('Error saving data:', error);
    showNotification('Error saving health data', 'error');
  }
}

async function generateSampleData() {
  try {
    const response = await fetch('/api/track/sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      showNotification('Sample data generated successfully!', 'success');
      await loadHealthData();
    } else {
      showNotification('Error generating sample data', 'error');
    }
  } catch (error) {
    console.error('Error generating sample data:', error);
    showNotification('Error generating sample data', 'error');
  }
}

function initializeCharts() {
  // Heart Rate Chart
  const hrCtx = $('#chart-hr');
  if (hrCtx) {
    hrChart = new Chart(hrCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Heart Rate (BPM)',
          data: [],
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#b3b3b3' }
          }
        },
        scales: {
          x: {
            ticks: { color: '#b3b3b3' },
            grid: { color: '#333333' }
          },
          y: {
            ticks: { color: '#b3b3b3' },
            grid: { color: '#333333' }
          }
        }
      }
    });
  }

  // Steps Chart
  const stepsCtx = $('#chart-steps');
  if (stepsCtx) {
    stepsChart = new Chart(stepsCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Daily Steps',
          data: [],
          backgroundColor: '#00ff88',
          borderColor: '#00cc66',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#b3b3b3' }
          }
        },
        scales: {
          x: {
            ticks: { color: '#b3b3b3' },
            grid: { color: '#333333' }
          },
          y: {
            ticks: { color: '#b3b3b3' },
            grid: { color: '#333333' }
          }
        }
      }
    });
  }

  // Sleep Chart
  const sleepCtx = $('#chart-sleep');
  if (sleepCtx) {
    sleepChart = new Chart(sleepCtx, {
      type: 'doughnut',
      data: {
        labels: ['Sleep', 'Awake'],
        datasets: [{
          data: [0, 24],
          backgroundColor: ['#00d4ff', '#333333'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#b3b3b3' }
          }
        }
      }
    });
  }
}

function updateCharts() {
  if (!healthData.length) return;

  // Get the last 7 days of data
  const recentData = healthData.slice(-7);
  
  // Update Heart Rate Chart
  if (hrChart) {
    hrChart.data.labels = recentData.map((_, index) => `Day ${index + 1}`);
    hrChart.data.datasets[0].data = recentData.map(d => d.heart_rate || 0);
    hrChart.update();
  }

  // Update Steps Chart
  if (stepsChart) {
    stepsChart.data.labels = recentData.map((_, index) => `Day ${index + 1}`);
    stepsChart.data.datasets[0].data = recentData.map(d => d.steps || 0);
    stepsChart.update();
  }

  // Update Sleep Chart
  if (sleepChart && recentData.length > 0) {
    const avgSleep = recentData.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / recentData.length;
    sleepChart.data.datasets[0].data = [avgSleep, 24 - avgSleep];
    sleepChart.update();
  }
}

function updateInsights() {
  const insightsContent = $('#insights-content');
  if (!insightsContent || !healthData.length) return;

  const recentData = healthData.slice(-7);
  const avgHR = recentData.reduce((sum, d) => sum + (d.heart_rate || 0), 0) / recentData.length;
  const avgSteps = recentData.reduce((sum, d) => sum + (d.steps || 0), 0) / recentData.length;
  const avgSleep = recentData.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / recentData.length;

  const insights = [];

  // Heart Rate Insights
  if (avgHR > 0) {
    if (avgHR < 60) {
      insights.push({
        icon: 'fas fa-heart',
        text: `Your average heart rate is ${avgHR.toFixed(1)} BPM, which is on the lower side. Consider consulting a healthcare provider if this is unusual for you.`,
        type: 'info'
      });
    } else if (avgHR > 100) {
      insights.push({
        icon: 'fas fa-exclamation-triangle',
        text: `Your average heart rate is ${avgHR.toFixed(1)} BPM, which is elevated. Consider stress management and consult a healthcare provider.`,
        type: 'warning'
      });
    } else {
      insights.push({
        icon: 'fas fa-check-circle',
        text: `Your average heart rate of ${avgHR.toFixed(1)} BPM is within a healthy range. Keep up the good work!`,
        type: 'success'
      });
    }
  }

  // Steps Insights
  if (avgSteps > 0) {
    if (avgSteps < 5000) {
      insights.push({
        icon: 'fas fa-walking',
        text: `You're averaging ${avgSteps.toFixed(0)} steps per day. Try to increase your daily activity to reach the recommended 10,000 steps.`,
        type: 'info'
      });
    } else if (avgSteps >= 10000) {
      insights.push({
        icon: 'fas fa-trophy',
        text: `Excellent! You're averaging ${avgSteps.toFixed(0)} steps per day, meeting the recommended daily target.`,
        type: 'success'
      });
    } else {
      insights.push({
        icon: 'fas fa-thumbs-up',
        text: `You're averaging ${avgSteps.toFixed(0)} steps per day. You're on the right track to reaching 10,000 steps!`,
        type: 'info'
      });
    }
  }

  // Sleep Insights
  if (avgSleep > 0) {
    if (avgSleep < 6) {
      insights.push({
        icon: 'fas fa-bed',
        text: `You're averaging ${avgSleep.toFixed(1)} hours of sleep per night. Adults typically need 7-9 hours for optimal health.`,
        type: 'warning'
      });
    } else if (avgSleep > 9) {
      insights.push({
        icon: 'fas fa-bed',
        text: `You're averaging ${avgSleep.toFixed(1)} hours of sleep per night. While sleep is important, excessive sleep may indicate other health issues.`,
        type: 'info'
      });
    } else {
      insights.push({
        icon: 'fas fa-moon',
        text: `Great! You're averaging ${avgSleep.toFixed(1)} hours of sleep per night, which is within the recommended range.`,
        type: 'success'
      });
    }
  }

  // Render insights
  if (insights.length === 0) {
    insightsContent.innerHTML = `
      <div class="insight-item">
        <i class="fas fa-info-circle"></i>
        <p>Add some health data to see personalized insights and recommendations.</p>
      </div>
    `;
  } else {
    insightsContent.innerHTML = insights.map(insight => `
      <div class="insight-item">
        <i class="${insight.icon}"></i>
        <p>${insight.text}</p>
      </div>
    `).join('');
  }
}

// Notification function (if not already defined in app.js)
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}