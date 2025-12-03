(function initializeTheme() {
  try {
    const storageKey = 'hp-theme';
    const storedTheme = window.localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = storedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  } catch (error) {
    document.documentElement.dataset.theme = 'dark';
  }
})();

