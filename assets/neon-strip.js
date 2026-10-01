(function () {
  var river = document.querySelector(".hero-neon-river");
  if (!river) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return;

  var container = river.querySelector(".neon-packets");
  if (!container) return;

  var packets = Array.prototype.slice.call(container.querySelectorAll(".neon-packet"));
  if (!packets.length) return;

  var hero = river.closest(".hero") || document.body;

  // Speed: 1 = idle, SPEED_CEILING = max mouse boost
  var SPEED_CEILING = 2.8;
  var BOOST_ATTACK = 0.085;
  var BOOST_DECAY = 0.035;
  var MOVE_SCALE = 0.012;
  var JITTER_MAX_X = 5.5;
  var JITTER_MAX_Y = 4.2;

  // Packet density: idle fewer, move reveals/spawns extras, hard ceiling
  var IDLE_COUNT = 5;
  var MAX_COUNT = 18;
  var DENSITY_ATTACK = 0.12;
  var DENSITY_DECAY = 0.045;
  var SIZES = [4, 5, 5, 6, 6, 7, 7, 8];

  var activity = 0;
  var boost = 1;
  var density = IDLE_COUNT;
  var lastX = null;
  var lastY = null;
  var lastT = 0;
  var raf = 0;
  var phases = [];

  function makePhase(i) {
    return {
      px: i * 1.7 + 0.4,
      py: i * 2.3 + 1.1,
      fx: 6.2 + (i % 3) * 1.4,
      fy: 5.1 + (i % 4) * 1.1,
      qx: 11.0 + i * 0.7,
      qy: 9.5 + i * 0.9
    };
  }

  function ensurePool() {
    while (packets.length < MAX_COUNT) {
      var i = packets.length;
      var el = document.createElement("span");
      el.className = "neon-packet is-dormant";
      el.setAttribute("aria-hidden", "true");
      var size = SIZES[i % SIZES.length];
      el.style.width = size + "px";
      el.style.height = size + "px";
      el.style.top = 40 + ((i * 17) % 16) + "%";
      el.style.animationDelay = (i * 0.37).toFixed(2) + "s";
      el.style.animationDuration = (2.2 + (i % 5) * 0.15).toFixed(2) + "s";
      container.appendChild(el);
      packets.push(el);
    }
    while (phases.length < packets.length) {
      phases.push(makePhase(phases.length));
    }
  }

  function applyDensity(count) {
    var n = Math.max(IDLE_COUNT, Math.min(MAX_COUNT, Math.round(count)));
    for (var i = 0; i < packets.length; i++) {
      if (packets[i].classList.contains("is-exploding")) continue;
      if (i < n) {
        packets[i].classList.remove("is-dormant");
      } else {
        packets[i].classList.add("is-dormant");
        packets[i].style.setProperty("--neon-jx", "0px");
        packets[i].style.setProperty("--neon-jy", "0px");
      }
    }
    return n;
  }

  function setPlaybackRate(rate) {
    for (var i = 0; i < packets.length; i++) {
      if (packets[i].classList.contains("is-dormant")) continue;
      if (packets[i].classList.contains("is-exploding")) continue;
      var anims = packets[i].getAnimations ? packets[i].getAnimations() : [];
      for (var a = 0; a < anims.length; a++) {
        anims[a].playbackRate = rate;
      }
    }
  }

  function onMove(e) {
    var now = performance.now();
    var x = e.clientX;
    var y = e.clientY;
    if (lastX != null && lastT) {
      var dt = Math.max(8, now - lastT);
      var dx = x - lastX;
      var dy = y - lastY;
      var speed = Math.sqrt(dx * dx + dy * dy) / dt;
      activity = Math.min(1, activity + speed * MOVE_SCALE * 16);
    }
    lastX = x;
    lastY = y;
    lastT = now;
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick(now) {
    raf = 0;
    activity = Math.max(0, activity - BOOST_DECAY);
    var target = 1 + activity * (SPEED_CEILING - 1);
    boost += (target - boost) * BOOST_ATTACK;
    if (boost < 1.002) boost = 1;
    if (boost > SPEED_CEILING) boost = SPEED_CEILING;

    var densityTarget = IDLE_COUNT + activity * (MAX_COUNT - IDLE_COUNT);
    var densRate = densityTarget > density ? DENSITY_ATTACK : DENSITY_DECAY;
    density += (densityTarget - density) * densRate;
    var activeCount = applyDensity(density);

    river.style.setProperty("--neon-boost", boost.toFixed(3));
    setPlaybackRate(boost);

    var t = now * 0.001;
    var amp = Math.max(0, boost - 1) / (SPEED_CEILING - 1);
    // Qubit-like 2-axis wobble: dual-frequency oscillation per active particle
    for (var i = 0; i < activeCount; i++) {
      var p = phases[i];
      var jx =
        Math.sin(t * p.fx + p.px) * JITTER_MAX_X * amp +
        Math.sin(t * p.qx + p.py) * JITTER_MAX_X * 0.45 * amp;
      var jy =
        Math.cos(t * p.fy + p.py) * JITTER_MAX_Y * amp +
        Math.sin(t * p.qy + p.px) * JITTER_MAX_Y * 0.5 * amp;
      packets[i].style.setProperty("--neon-jx", jx.toFixed(2) + "px");
      packets[i].style.setProperty("--neon-jy", jy.toFixed(2) + "px");
    }

    if (activity > 0.001 || boost > 1.01 || density > IDLE_COUNT + 0.2) {
      raf = requestAnimationFrame(tick);
    } else {
      boost = 1;
      density = IDLE_COUNT;
      applyDensity(IDLE_COUNT);
      river.style.setProperty("--neon-boost", "1");
      setPlaybackRate(1);
      for (var j = 0; j < packets.length; j++) {
        packets[j].style.setProperty("--neon-jx", "0px");
        packets[j].style.setProperty("--neon-jy", "0px");
      }
    }
  }


  function onRiverClick(e) {
    if (reduce.matches) return;
    var clickX = e.clientX;
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < packets.length; i++) {
      var el = packets[i];
      if (el.classList.contains("is-dormant") || el.classList.contains("is-exploding")) continue;
      var rect = el.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var dist = Math.abs(cx - clickX);
      if (dist < bestDist) {
        bestDist = dist;
        best = el;
      }
    }
    if (!best) return;
    var target = best;
    var savedDuration = target.style.animationDuration;
    var savedDelay = target.style.animationDelay;
    target.classList.add("is-exploding");
    function onExplodeEnd(ev) {
      if (ev.animationName && ev.animationName !== "neon-explode") return;
      target.removeEventListener("animationend", onExplodeEnd);
      target.classList.remove("is-exploding");
      target.style.animation = "none";
      void target.offsetWidth;
      target.style.animation = "";
      if (savedDuration) target.style.animationDuration = savedDuration;
      if (savedDelay) target.style.animationDelay = savedDelay;
    }
    target.addEventListener("animationend", onExplodeEnd);
  }

  function onReduceChange() {
    if (reduce.matches) {
      hero.removeEventListener("mousemove", onMove);
      river.removeEventListener("click", onRiverClick);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      boost = 1;
      density = IDLE_COUNT;
      applyDensity(IDLE_COUNT);
      river.style.setProperty("--neon-boost", "1");
      setPlaybackRate(1);
      packets.forEach(function (el) {
        el.classList.remove("is-exploding");
        el.style.setProperty("--neon-jx", "0px");
        el.style.setProperty("--neon-jy", "0px");
      });
    } else {
      hero.addEventListener("mousemove", onMove, { passive: true });
      river.addEventListener("click", onRiverClick);
    }
  }

  ensurePool();
  applyDensity(IDLE_COUNT);

  hero.addEventListener("mousemove", onMove, { passive: true });
  river.addEventListener("click", onRiverClick);
  if (typeof reduce.addEventListener === "function") {
    reduce.addEventListener("change", onReduceChange);
  } else if (typeof reduce.addListener === "function") {
    reduce.addListener(onReduceChange);
  }
})();
