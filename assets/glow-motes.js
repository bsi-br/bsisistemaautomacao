(function () {
  var river = document.querySelector(".hero-neon-river");
  if (!river) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return;

  var container = river.querySelector(".neon-packets");
  if (!container) return;

  var MOTE_COUNT = 2;
  var SIZE = 24;
  var IDLE_MIN_MS = 8000;
  var IDLE_MAX_MS = 20000;
  var GLANCE_MIN_MS = 650;
  var GLANCE_MAX_MS = 1200;
  var APPROACH_MS = 1400;
  var LIFT_MS = 520;
  var RETURN_MS = 1200;
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

  /** Visual center of packet relative to river (animation-aware). */
  function packetCenter(el) {
    var rr = river.getBoundingClientRect();
    var pr = el.getBoundingClientRect();
    return {
      x: pr.left - rr.left + pr.width / 2,
      y: pr.top - rr.top + pr.height / 2
    };
  }

  function activePackets() {
    var all = container.querySelectorAll(".neon-packet");
    var out = [];
    var rs = riverSize();
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.classList.contains("is-dormant")) continue;
      if (el.classList.contains("is-held")) continue;
      var op = getComputedStyle(el).opacity;
      if (parseFloat(op) < 0.2) continue;
      var cs = packetCenter(el);
      if (cs.x < rs.w * 0.1 || cs.x > rs.w * 0.9) continue;
      if (cs.y < 0 || cs.y > rs.h) continue;
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

  function holdPacket(packet) {
    // Leave the pipe: stop flow animation + hide in-channel blob
    packet.classList.add("is-held");
    packet.style.animation = "none";
    packet.style.translate = "none";
  }

  function releasePacket(packet, drop, moteEl) {
    if (!packet) return;
    if (moteEl) moteEl.classList.remove("is-carrying", "is-analyzing");
    // Re-enter channel near drop X so return is visible (not a mid-flow pop)
    var rs = riverSize();
    var pct = clamp((drop.x / rs.w) * 100, 4, 96);
    packet.style.left = pct + "%";
    packet.style.top = clamp(drop.y, rs.h * 0.4, rs.h * 0.58) + "px";
    packet.classList.remove("is-held");
    // Restart neon-flow from this X
    packet.style.animation = "none";
    void packet.offsetWidth;
    packet.style.animation = "";
    packet.style.translate = "";
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
      y: rand(rs.h * 0.22, rs.h * 0.48)
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
      var ampY = rs2.h * 0.1;
      // Idle stays mostly above mid-pipe so it doesn't fight channel blobs
      pos.x = idleOrigin.x + Math.sin(t * 0.35 + idlePhase) * ampX + Math.sin(t * 0.17 + idlePhase * 1.3) * ampX * 0.4;
      pos.y = idleOrigin.y + Math.cos(t * 0.42 + idlePhase) * ampY + Math.sin(t * 0.23 + idlePhase) * ampY * 0.35;
      pos.x = clamp(pos.x, rs2.w * 0.1, rs2.w * 0.9);
      pos.y = clamp(pos.y, rs2.h * 0.08, rs2.h * 0.42);
      setPos(el, pos.x, pos.y);
      idleRaf = requestAnimationFrame(idleTick);
    }

    function startIdle() {
      busy = false;
      el.classList.add("is-idle");
      el.classList.remove("is-carrying", "is-action", "is-analyzing");
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

    function runCycle() {
      if (stopped) return;
      stopIdle();
      el.classList.add("is-action");
      setFrame(el, 0);

      var packet = pickPacket(pos);
      if (!packet) {
        var rs3 = riverSize();
        var hop = {
          x: clamp(pos.x + rand(-80, 80), rs3.w * 0.12, rs3.w * 0.88),
          y: clamp(rand(rs3.h * 0.12, rs3.h * 0.38), rs3.h * 0.08, rs3.h * 0.45)
        };
        animateTo(el, pos, hop, 1600, function () {
          pos = hop;
          startIdle();
          schedule(rand(IDLE_MIN_MS, IDLE_MAX_MS));
        });
        return;
      }

      var target = packetCenter(packet);
      var approach = { x: target.x, y: target.y };

      animateTo(el, pos, approach, APPROACH_MS + rand(-200, 200), function () {
        // Refresh target in case packet moved during approach
        if (!packet.classList.contains("is-held") && document.body.contains(packet)) {
          target = packetCenter(packet);
        }
        pos = { x: target.x, y: target.y };
        setPos(el, pos.x, pos.y);

        // 1) Grab: take blue ball OUT of the pipe
        holdPacket(packet);
        el.classList.add("is-carrying");
        setFrame(el, 1);

        var rsLift = riverSize();
        // Clear of the channel band (packets sit ~40–55% down)
        var analyze = {
          x: clamp(pos.x + rand(-18, 18), rsLift.w * 0.12, rsLift.w * 0.88),
          y: clamp(rsLift.h * rand(0.06, 0.16), 4, rsLift.h * 0.22)
        };

        animateTo(el, pos, analyze, LIFT_MS + rand(-40, 80), function () {
          pos = analyze;
          // 2) Analyze outside the pipe
          setFrame(el, 2);
          el.classList.add("is-analyzing");

          var glanceMs = rand(GLANCE_MIN_MS, GLANCE_MAX_MS);
          setTimeout(function () {
            el.classList.remove("is-analyzing");
            setFrame(el, 3);
            var rs4 = riverSize();
            // 3) Return to channel mid-line and put packet back in flow
            var drop = {
              x: clamp(pos.x + rand(-36, 36), rs4.w * 0.15, rs4.w * 0.85),
              y: rs4.h * 0.48 + rand(-5, 5)
            };
            animateTo(el, pos, drop, RETURN_MS + rand(-150, 150), function () {
              pos = drop;
              releasePacket(packet, drop, el);
              setFrame(el, 0);
              // Drift slightly above pipe again for idle
              pos.y = clamp(drop.y - rs4.h * 0.22, rs4.h * 0.08, rs4.h * 0.35);
              setPos(el, pos.x, pos.y);
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
        for (var i = 0; i < held.length; i++) {
          held[i].classList.remove("is-held");
          held[i].style.animation = "";
          held[i].style.translate = "";
        }
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
