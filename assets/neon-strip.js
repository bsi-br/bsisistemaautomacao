(function () {
  var river = document.querySelector(".hero-neon-river");
  if (!river) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return;

  var packets = Array.prototype.slice.call(river.querySelectorAll(".neon-packet"));
  if (!packets.length) return;

  var hero = river.closest(".hero") || document.body;

  // Speed: 1 = idle, SPEED_CEILING = max mouse boost
  var SPEED_CEILING = 2.4;
  var BOOST_ATTACK = 0.085;
  var BOOST_DECAY = 0.035;
  var MOVE_SCALE = 0.012;
  var JITTER_MAX_X = 5.5;
  var JITTER_MAX_Y = 4.2;

  var activity = 0;
  var boost = 1;
  var lastX = null;
  var lastY = null;
  var lastT = 0;
  var raf = 0;
  var phases = packets.map(function (_, i) {
    return {
      px: i * 1.7 + 0.4,
      py: i * 2.3 + 1.1,
      fx: 6.2 + (i % 3) * 1.4,
      fy: 5.1 + (i % 4) * 1.1,
      qx: 11.0 + i * 0.7,
      qy: 9.5 + i * 0.9
    };
  });

  function setPlaybackRate(rate) {
    for (var i = 0; i < packets.length; i++) {
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

    river.style.setProperty("--neon-boost", boost.toFixed(3));
    setPlaybackRate(boost);

    var t = now * 0.001;
    var amp = Math.max(0, boost - 1) / (SPEED_CEILING - 1);
    // Qubit-like 2-axis wobble: dual-frequency oscillation per particle
    for (var i = 0; i < packets.length; i++) {
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

    if (activity > 0.001 || boost > 1.01) {
      raf = requestAnimationFrame(tick);
    } else {
      boost = 1;
      river.style.setProperty("--neon-boost", "1");
      setPlaybackRate(1);
      for (var j = 0; j < packets.length; j++) {
        packets[j].style.setProperty("--neon-jx", "0px");
        packets[j].style.setProperty("--neon-jy", "0px");
      }
    }
  }

  function onReduceChange() {
    if (reduce.matches) {
      hero.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      river.style.setProperty("--neon-boost", "1");
      setPlaybackRate(1);
      packets.forEach(function (el) {
        el.style.setProperty("--neon-jx", "0px");
        el.style.setProperty("--neon-jy", "0px");
      });
    } else {
      hero.addEventListener("mousemove", onMove, { passive: true });
    }
  }

  hero.addEventListener("mousemove", onMove, { passive: true });
  if (typeof reduce.addEventListener === "function") {
    reduce.addEventListener("change", onReduceChange);
  } else if (typeof reduce.addListener === "function") {
    reduce.addListener(onReduceChange);
  }
})();
