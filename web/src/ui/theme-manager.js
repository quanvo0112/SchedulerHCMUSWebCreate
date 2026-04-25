const THEME_STORAGE_KEY = "unitime-theme";
const THEME_TOGGLE_ID = "themeToggleBtn";

function getStoredTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : null;
  } catch (error) {
    return null;
  }
}

function getSystemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  const resolvedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = resolvedTheme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
  } catch (error) {
    // Ignore storage failures and keep the current session theme in memory.
  }

  return resolvedTheme;
}

function syncThemeToggle(toggleEl, theme) {
  const isDark = theme === "dark";
  const iconEl = toggleEl.querySelector(".theme-toggle__icon");
  const labelEl = toggleEl.querySelector(".theme-toggle__label");

  toggleEl.setAttribute("aria-pressed", String(isDark));
  toggleEl.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");

  if (iconEl instanceof HTMLElement) {
    iconEl.textContent = isDark ? "☾" : "☀";
  }

  if (labelEl instanceof HTMLElement) {
    labelEl.textContent = isDark ? "Dark" : "Light";
  }
}

export function initializeThemeToggle() {
  const toggleEl = document.getElementById(THEME_TOGGLE_ID);
  if (!toggleEl) {
    return;
  }

  const savedTheme = getStoredTheme();
  const initialTheme = savedTheme || document.documentElement.dataset.theme || getSystemTheme();
  const appliedTheme = applyTheme(initialTheme);
  syncThemeToggle(toggleEl, appliedTheme);

  toggleEl.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    const appliedNextTheme = applyTheme(nextTheme);
    syncThemeToggle(toggleEl, appliedNextTheme);
  });
}