(function () {
  var OPEN_DELAY = 60;
  var CLOSE_DELAY = 260;
  var items = Array.prototype.slice.call(document.querySelectorAll(".nav li.has-dropdown"));
  var timers = new WeakMap();

  function getTimers(li) {
    var t = timers.get(li);
    if (!t) {
      t = { open: null, close: null };
      timers.set(li, t);
    }
    return t;
  }

  function closeOthers(except) {
    items.forEach(function (li) {
      if (li === except) return;
      var t = getTimers(li);
      clearTimeout(t.open);
      clearTimeout(t.close);
      li.classList.remove("open");
      var btn = li.querySelector("button");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function setOpen(li, isOpen) {
    li.classList.toggle("open", isOpen);
    var btn = li.querySelector("button");
    if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  items.forEach(function (li) {
    var t = getTimers(li);

    function open() {
      if (window.innerWidth <= 720) return;
      clearTimeout(t.close);
      closeOthers(li);
      t.open = setTimeout(function () {
        setOpen(li, true);
      }, OPEN_DELAY);
    }

    function close() {
      if (window.innerWidth <= 720) return;
      clearTimeout(t.open);
      t.close = setTimeout(function () {
        setOpen(li, false);
      }, CLOSE_DELAY);
    }

    li.addEventListener("mouseenter", open);
    li.addEventListener("mouseleave", close);
    li.addEventListener("focusin", open);
    li.addEventListener("focusout", function (e) {
      if (li.contains(e.relatedTarget)) return;
      close();
    });
  });

  var menuToggle = document.getElementById("menuToggle");
  var mainNav = document.getElementById("mainNav");
  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("nav-open");
      menuToggle.classList.toggle("is-open", isOpen);
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (!isOpen) {
        items.forEach(function (li) {
          setOpen(li, false);
        });
      }
    });
  }

  document.querySelectorAll(".nav li.has-dropdown > button").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      if (window.innerWidth > 720) return;
      e.preventDefault();
      var li = btn.closest("li");
      var willOpen = !li.classList.contains("open");
      closeOthers(li);
      setOpen(li, willOpen);
    });
  });
})();
