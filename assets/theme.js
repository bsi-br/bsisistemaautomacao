(function () {
  var KEY = "bsi-theme";
  var root = document.documentElement;

  function current() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function apply(theme) {
    var next = theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {}
    syncToggle(next);
  }

  function syncToggle(theme) {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;
    var isLight = theme === "light";
    btn.setAttribute("aria-label", isLight ? "Ativar tema escuro" : "Ativar tema claro");
    btn.setAttribute("title", isLight ? "Tema escuro" : "Tema claro");
    btn.setAttribute("aria-pressed", isLight ? "true" : "false");
    btn.classList.toggle("is-light", isLight);
  }

  // Prefer stored preference; otherwise keep dark default (matches today's site).
  // FOUC blocker in <head> may already have set data-theme from localStorage.
  if (!root.getAttribute("data-theme")) {
    var stored = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch (e) {}
    apply(stored === "light" || stored === "dark" ? stored : "dark");
  } else {
    syncToggle(current());
  }

  function bind() {
    var btn = document.getElementById("themeToggle");
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", function () {
      apply(current() === "light" ? "dark" : "light");
    });
    syncToggle(current());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
