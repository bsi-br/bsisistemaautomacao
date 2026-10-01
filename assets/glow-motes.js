(function () {
  var river = document.querySelector(".hero-neon-river");
  if (!river) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return;

  var container = river.querySelector(".neon-packets");
  if (!container) return;

  var MOTE_COUNT = 2;
  var SIZE = 24;
  var HALF = SIZE / 2;
  var IDLE_MIN_MS = 8000;
  var IDLE_MAX_MS = 20000;
  var GLANCE_MIN_MS = 400;
  var GLANCE_MAX_MS = 900;
  var APPROACH_MS = 1400;
  var RETURN_MS = 1100;
  var STAGGER_MS = 4500;

  var layer = document.createElement("div");
  layer.className = "glow-motes";
  layer.setAttribute("aria-hidden", "true");
  river.appendChild(layer);

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function riverSize() {
    return { w: river.clientWidth || 1, h: river.clientHeight || 1 };
  }

  function packetCenter(el) {
    return {
      x: el.offsetLeft + el.offsetWidth / 2,
      y: el.offsetTop + el.offsetHeight / 2
    };
  }

  function activePackets() {
    var all = container.querySelectorAll(".neon-packet");
    var out = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.classList.contains("is-dormant")) continue;
      if (el.classList.contains("is-held")) continue;
      var op = getComputedStyle(el).opacity;
      if (parseFloat(op) < 0.15) continue;
      var cs = packetCenter(el);
      var rs = riverSize();
      if (cs.x < rs.w * 0.08 || cs.x > rs.w * 0.92) continue;
      out.push(el);
    }
    return out;
  }

  function pickPacket(near) {
    var list = activePackets();
    if (!list.length) return null;
    if (!near) return list[Math.floor(Math.random() * list.length)];
    var best = null;
    var bestD = Infinity;
    for (var i = 0; i < list.length; i++) {
      var c = packetCenter(list[i]);
      var dx = c.x - near.x;
      var dy = c.y - near.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = list[i];
      }
    }
    return best;
  }

  function setPos(el, x, y) {
    el.style.left = x + "px";
    el.style.top = y + "px";
  }

  function setFrame(el, frame) {
    el.dataset.frame = String(frame);
  }

  function animateTo(el, from, to, ms, onDone) {
    var t0 = performance.now();
    // Soft bezier via mid control offset
    var cx = (from.x + to.x) / 2 + (to.y - from.y) * 0.35 + rand(-12, 12);
    var cy = (from.y + to.y) / 2 - Math.abs(to.x - from.x) * 0.12 - rand(6, 22);

    function step(now) {
      var t = clamp((now - t0) / ms, 0, 1);
      var u = easeInOut(t);
      var omt = 1 - u;
      var x = omt * omt * from.x + 2 * omt * u * cx + u * u * to.x;
      var y = omt * omt * from.y + 2 * omt * u * cy + u * u * to.y;
      setPos(el, x, y);
      if (t < 1) {
        requestAnimationFrame(step);
      } else if (onDone) {
        onDone();
      }
    }
    requestAnimationFrame(step);
  }

  function createMote(index) {
    var el = document.createElement("div");
    el.className = "glow-mote is-idle";
    el.setAttribute("aria-hidden", "true");
    setFrame(el, 0);
    layer.appendChild(el);

    var rs = riverSize();
    var pos = {
      x: rand(rs.w * 0.18, rs.w * 0.82),
      y: rand(rs.h * 0.28, rs.h * 0.62)
    };
    setPos(el, pos.x, pos.y);

    var idleRaf = 0;
    var idleOrigin = { x: pos.x, y: pos.y };
    var idlePhase = rand(0, Math.PI * 2);
    var busy = false;
    var stopped = false;

    function idleTick(now) {
      if (stopped || busy) return;
      var rs2 = riverSize();
      var t = now * 0.001;
      var ampX = rs2.w * 0.035;
      var ampY = rs2.h * 0.12;
      pos.x = idleOrigin.x + Math.sin(t * 0.35 + idlePhase) * ampX + Math.sin(t * 0.17 + idlePhase * 1.3) * ampX * 0.4;
      pos.y = idleOrigin.y + Math.cos(t * 0.42 + idlePhase) * ampY + Math.sin(t * 0.23 + idlePhase) * ampY * 0.35;
      pos.x = clamp(pos.x, rs2.w * 0.1, rs2.w * 0.9);
      pos.y = clamp(pos.y, rs2.h * 0.18, rs2.h * 0.72);
      setPos(el, pos.x, pos.y);
      idleRaf = requestAnimationFrame(idleTick);
    }

    function startIdle() {
      busy = false;
      el.classList.add("is-idle");
      el.classList.remove("is-carrying", "is-action");
      setFrame(el, 0);
      idleOrigin.x = pos.x;
      idleOrigin.y = pos.y;
      if (!idleRaf) idleRaf = requestAnimationFrame(idleTick);
    }

    function stopIdle() {
      busy = true;
      el.classList.remove("is-idle");
      if (idleRaf) {
        cancelAnimationFrame(idleRaf);
        idleRaf = 0;
      }
    }

    function releasePacket(packet) {
      if (!packet) return;
      packet.classList.remove("is-held");
      el.classList.remove("is-carrying");
    }

    function runCycle() {
      if (stopped) return;
      stopIdle();
      el.classList.add("is-action");
      setFrame(el, 0);

      var packet = pickPacket(pos);
      if (!packet) {
        // No packet — soft wander hop then retry later
        var rs3 = riverSize();
        var hop = {
          x: clamp(pos.x + rand(-80, 80), rs3.w * 0.12, rs3.w * 0.88),
          y: clamp(rand(rs3.h * 0.3, rs3.h * 0.58), rs3.h * 0.2, rs3.h * 0.7)
        };
        animateTo(el, pos, hop, 1600, function () {
          pos = hop;
          startIdle();
          schedule(rand(IDLE_MIN_MS, IDLE_MAX_MS));
        });
        return;
      }

      var target = packetCenter(packet);
      // Aim slightly above packet for a soft approach
      var approach = { x: target.x, y: target.y - 4 };

      animateTo(el, pos, approach, APPROACH_MS + rand(-200, 200), function () {
        pos = { x: approach.x, y: approach.y };

        // Grab
        packet.classList.add("is-held");
        el.classList.add("is-carrying");
        setFrame(el, 1);

        // Short lift while grabbing
        var lift = { x: pos.x + rand(-10, 10), y: clamp(pos.y - rand(10, 22), 8, riverSize().h * 0.45) };
        animateTo(el, pos, lift, 380, function () {
          pos = lift;
          setFrame(el, 2); // glance

          var glanceMs = rand(GLANCE_MIN_MS, GLANCE_MAX_MS);
          setTimeout(function () {
            setFrame(el, 3); // return pose
            var rs4 = riverSize();
            var drop = {
              x: clamp(pos.x + rand(-40, 40), rs4.w * 0.15, rs4.w * 0.85),
              y: rs4.h * 0.48 + rand(-6, 6)
            };
            animateTo(el, pos, drop, RETURN_MS + rand(-150, 150), function () {
              pos = drop;
              releasePacket(packet);
              setFrame(el, 0);
              startIdle();
              schedule(rand(IDLE_MIN_MS, IDLE_MAX_MS));
            });
          }, glanceMs);
        });
      });
    }

    var timer = 0;
    function schedule(ms) {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(runCycle, ms);
    }

    function onReduce() {
      if (reduce.matches) {
        stopped = true;
        clearTimeout(timer);
        stopIdle();
        el.style.display = "none";
        var held = container.querySelectorAll(".neon-packet.is-held");
        for (var i = 0; i < held.length; i++) held[i].classList.remove("is-held");
      }
    }

    startIdle();
    schedule(1800 + index * STAGGER_MS + rand(0, 1200));

    if (typeof reduce.addEventListener === "function") {
      reduce.addEventListener("change", onReduce);
    } else if (typeof reduce.addListener === "function") {
      reduce.addListener(onReduce);
    }

    return el;
  }

  for (var i = 0; i < MOTE_COUNT; i++) {
    createMote(i);
  }
})();
