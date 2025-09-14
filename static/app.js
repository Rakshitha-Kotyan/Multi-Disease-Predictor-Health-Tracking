const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', function() {
  // Animate stats on scroll
  const animateStats = () => {
    const stats = $$('.stat-number');
    stats.forEach(stat => {
      const target = parseInt(stat.dataset.target);
      const duration = 2000;
      const increment = target / (duration / 16);
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        stat.textContent = Math.floor(current);
      }, 16);
    });
  };

  // Intersection Observer for animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
        if (entry.target.classList.contains('stats')) {
          animateStats();
        }
      }
    });
  }, observerOptions);

  // Observe elements for animation
  $$('.feature-card, .stats, .section-header').forEach(el => {
    observer.observe(el);
  });

  // Mobile menu toggle
  const mobileToggle = $('.mobile-menu-toggle');
  const navLinks = $('.nav-links');
  const navAuth = $('.nav-auth');

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      navAuth.classList.toggle('active');
      mobileToggle.classList.toggle('active');
    });
  }

  // Navbar scroll effect
  let lastScrollY = window.scrollY;
  const navbar = $('.navbar');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    // Hide/show navbar on scroll
    if (window.scrollY > lastScrollY && window.scrollY > 200) {
      navbar.style.transform = 'translateY(-100%)';
    } else {
      navbar.style.transform = 'translateY(0)';
    }
    lastScrollY = window.scrollY;
  });

  // Parallax effect for hero section
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = $('.hero');
    if (hero) {
      hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
  });

  // Add loading states to buttons
  $$('button, .btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (this.type === 'submit' || this.classList.contains('btn-primary')) {
        this.style.opacity = '0.7';
        this.style.pointerEvents = 'none';
        
        setTimeout(() => {
          this.style.opacity = '1';
          this.style.pointerEvents = 'auto';
        }, 2000);
      }
    });
  });
});

// Tabs functionality
$$('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    const targetTab = document.querySelector(`#tab-${tab}`);
    if (targetTab) {
      targetTab.classList.add('active');
    }
  });
});

// Load symptoms
async function loadSymptoms() {
  try {
    const res = await fetch('/api/symptoms');
    const data = await res.json();
    const select = $('#symptom-select');
    if (select) {
      select.innerHTML = '';
      data.symptoms.forEach(sym => {
        const opt = document.createElement('option');
        opt.value = sym; 
        opt.textContent = sym;
        select.appendChild(opt);
      });
    }
  } catch (error) {
    console.error('Error loading symptoms:', error);
  }
}

// Only load symptoms if we're on a page that needs them
if ($('#symptom-select')) {
  loadSymptoms();
}

// Predict functionality
const predictBtn = $('#predict-btn');
if (predictBtn) {
  predictBtn.addEventListener('click', async () => {
    const selected = Array.from($('#symptom-select').selectedOptions).map(o => o.value);
    const topk = parseInt($('#topk').value || '3', 10);
    
    if (!selected.length) {
      showNotification('Please select at least one symptom', 'warning');
      return;
    }

    // Show loading state
    predictBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    predictBtn.disabled = true;

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: selected, top_k: topk })
      });
      const data = await res.json();
      renderResults(data.predictions || []);
      showNotification('Analysis complete!', 'success');
    } catch (error) {
      showNotification('Error analyzing symptoms. Please try again.', 'error');
      console.error('Prediction error:', error);
    } finally {
      predictBtn.innerHTML = '<i class="fas fa-brain"></i> Predict';
      predictBtn.disabled = false;
    }
  });
}

function renderResults(predictions) {
  const box = $('#results');
  if (!box) return;
  
  box.innerHTML = '';
  if (!predictions.length) { 
    box.innerHTML = '<div class="no-results">No results found. Please try different symptoms.</div>';
    return; 
  }
  
  predictions.forEach((p, index) => {
    const div = document.createElement('div');
    div.className = 'prediction';
    div.style.animationDelay = `${index * 0.1}s`;
    div.innerHTML = `
      <div class="prediction-header">
        <h3>${p.disease}</h3>
        <div class="confidence-badge">
          <i class="fas fa-chart-line"></i>
          ${(p.confidence * 100).toFixed(1)}%
        </div>
      </div>
      <p class="prediction-description">${p.description}</p>
      ${p.precautions && p.precautions.length ? `
        <div class="precautions">
          <h4><i class="fas fa-shield-alt"></i> Precautions</h4>
          <ul>${p.precautions.map(x => `<li>${x}</li>`).join('')}</ul>
        </div>
      ` : ''}
    `;
    box.appendChild(div);
  });
}

// Tracking functionality
const saveTrackBtn = $('#save-track');
if (saveTrackBtn) {
  saveTrackBtn.addEventListener('click', async () => {
    const payload = {
      heart_rate: parseFloat($('#hr').value || '0'),
      steps: parseInt($('#steps').value || '0', 10),
      sleep_hours: parseFloat($('#sleep').value || '0')
    };

    // Show loading state
    saveTrackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveTrackBtn.disabled = true;

    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const output = $('#track-output');
      if (output) {
        output.textContent = JSON.stringify(data, null, 2);
      }
      showNotification('Health data saved successfully!', 'success');
    } catch (error) {
      showNotification('Error saving health data', 'error');
      console.error('Tracking error:', error);
    } finally {
      saveTrackBtn.innerHTML = '<i class="fas fa-save"></i> Save Data';
      saveTrackBtn.disabled = false;
    }
  });
}

// Notification system
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => notification.classList.add('show'), 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS for notifications
const notificationStyles = `
  .notification {
    position: fixed;
    top: 100px;
    right: 20px;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    box-shadow: var(--shadow);
  }
  
  .notification.show {
    transform: translateX(0);
  }
  
  .notification-success {
    border-left: 4px solid var(--secondary-color);
  }
  
  .notification-error {
    border-left: 4px solid var(--accent-color);
  }
  
  .notification-warning {
    border-left: 4px solid #ffa500;
  }
  
  .notification-info {
    border-left: 4px solid var(--primary-color);
  }
  
  .confidence-badge {
    background: var(--gradient-primary);
    color: var(--text-primary);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .prediction-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .precautions h4 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .no-results {
    text-align: center;
    color: var(--text-secondary);
    padding: 2rem;
    font-style: italic;
  }
  
  .navbar.scrolled {
    background: rgba(10, 10, 10, 0.98);
  }
  
  @media (max-width: 768px) {
    .nav-links.active,
    .nav-auth.active {
      display: flex;
      flex-direction: column;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--card-bg);
      border-top: 1px solid var(--border-color);
      padding: 1rem;
      gap: 1rem;
    }
    
    .nav-links {
      display: none;
    }
    
    .nav-auth {
      display: none;
    }
  }
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// FAQ functionality
document.addEventListener('DOMContentLoaded', function() {
  const faqItems = $$('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all other FAQ items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
        }
      });
      
      // Toggle current item
      if (isActive) {
        item.classList.remove('active');
      } else {
        item.classList.add('active');
      }
    });
  });
  
  // Contact form handling
  const contactForm = $('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const data = Object.fromEntries(formData);
      
      // Show loading state
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      submitBtn.disabled = true;
      
      // Simulate form submission (replace with actual API call)
      setTimeout(() => {
        showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
        this.reset();
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }, 2000);
    });
  }
});



