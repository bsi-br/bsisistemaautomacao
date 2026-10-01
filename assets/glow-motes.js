(function () {
  var river = document.querySelector(".hero-neon-river");
  if (!river) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var container = river.querySelector(".neon-packets");
  if (!container) return;

  var MOTE_COUNT = 2;
  var IDLE_MIN_MS = 4000;
  var IDLE_MAX_MS = 10000;
  var GLANCE_MIN_MS = 700;
  var GLANCE_MAX_MS = 1300;
  var CHASE_MAX_MS = 3200;
  var GRAB_RADIUS = 16;
  var LIFT_MS = 480;
  var RETURN_MS = 1000;
  var STAGGER_MS = 3200;
  var RETRY_MS_MIN = 600;
  var RETRY_MS_MAX = 1400;

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

  /** Rotation angle (rad) from computed transform matrix. */
  function riverAngle() {
    var tr = getComputedStyle(river).transform;
    if (!tr || tr === "none") return 0;
    var m = new DOMMatrixReadOnly(tr);
    return Math.atan2(m.b, m.a);
  }

  /**
   * Visual center of packet in river LOCAL coords (left/top space).
   * Uses getBoundingClientRect (sees animation left + transform + translate)
   * then inverse-rotates into the river's untransformed box.
   */
  function packetCenter(el) {
    var pr = el.getBoundingClientRect();
    var rr = river.getBoundingClientRect();
    var pcx = pr.left + pr.width / 2;
    var pcy = pr.top + pr.height / 2;
    var rcx = rr.left + rr.width / 2;
    var rcy = rr.top + rr.height / 2;
    var dx = pcx - rcx;
    var dy = pcy - rcy;
    var ang = -riverAngle(); // inverse of river rotate(...)
    var cos = Math.cos(ang);
    var sin = Math.sin(ang);
    var lx = dx * cos - dy * sin;
    var ly = dx * sin + dy * cos;
    return {
      x: river.clientWidth / 2 + lx,
      y: river.clientHeight / 2 + ly
    };
  }

  function inBand(cs, rs) {
    return (
      cs.x >= rs.w * 0.05 &&
      cs.x <= rs.w * 0.95 &&
      cs.y >= rs.h * 0.15 &&
      cs.y <= rs.h * 0.85
    );
  }

  function activePackets() {
    var all = container.querySelectorAll(".neon-packet");
    var out = [];
    var rs = riverSize();
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.classList.contains("is-dormant")) continue;
      if (el.classList.contains("is-held")) continue;
      // Relaxed: allow faint packets (was opacity < 0.15 / 0.2)
      var op = parseFloat(getComputedStyle(el).opacity);
      if (!(op > 0.05)) continue;
      var cs = packetCenter(el);
      if (!inBand(cs, rs)) continue;
      out.push(el);
    }
    return out;
  }

  function pickPacket(near) {
    var list = activePackets();
    if (!list.length) return null;
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
    var rs = riverSize();
    x = clamp(x, 14, rs.w - 14);
    y = clamp(y, 8, rs.h - 8);
    el.style.left = x + "px";
    el.style.top = y + "px";
    return { x: x, y: y };
  }

  function setFrame(el, frame) {
    el.dataset.frame = String(frame);
  }

  function animateTo(el, from, to, ms, onDone) {
    var t0 = performance.now();
    var cx = (from.x + to.x) / 2 + rand(-6, 6);
    var cy = (from.y + to.y) / 2 - rand(3, 10);

    function step(now) {
      var t = clamp((now - t0) / ms, 0, 1);
      var u = easeInOut(t);
      var omt = 1 - u;
      var x = omt * omt * from.x + 2 * omt * u * cx + u * u * to.x;
      var y = omt * omt * from.y + 2 * omt * u * cy + u * u * to.y;
      setPos(el, x, y);
      if (t < 1) requestAnimationFrame(step);
      else if (onDone) onDone(setPos(el, to.x, to.y));
    }
    requestAnimationFrame(step);
  }

  function holdPacket(packet) {
    packet.classList.add("is-held");
    packet.style.animation = "none";
    packet.style.translate = "none";
    packet.style.opacity = "0";
    packet.style.visibility = "hidden";
  }

  function releasePacket(packet, drop, moteEl) {
    if (!packet) return;
    if (moteEl) moteEl.classList.remove("is-carrying", "is-analyzing");
    var rs = riverSize();
    var pct = clamp((drop.x / rs.w) * 100, 6, 94);
    packet.style.left = pct + "%";
    packet.style.top = clamp(drop.y, rs.h * 0.42, rs.h * 0.58) + "px";
    packet.style.opacity = "";
    packet.style.visibility = "";
    packet.classList.remove("is-held");
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

    var rs0 = riverSize();
    var pos = setPos(
      el,
      rand(rs0.w * 0.28, rs0.w * 0.72),
      rand(rs0.h * 0.2, rs0.h * 0.36)
    );

    var idleRaf = 0;
    var idleOrigin = { x: pos.x, y: pos.y };
    var idlePhase = rand(0, Math.PI * 2);
    var busy = false;
    var stopped = false;
    var chaseRaf = 0;

    function idleTick(now) {
      if (stopped || busy) return;
      if (reduce.matches) return; // static under reduced motion
      var rs = riverSize();
      var t = now * 0.001;
      var x = idleOrigin.x + Math.sin(t * 0.4 + idlePhase) * rs.w * 0.028;
      var y = idleOrigin.y + Math.cos(t * 0.5 + idlePhase) * rs.h * 0.05;
      pos = setPos(el, x, y);
      idleRaf = requestAnimationFrame(idleTick);
    }

    function startIdle() {
      busy = false;
      el.classList.add("is-idle");
      el.classList.remove("is-carrying", "is-action", "is-analyzing");
      setFrame(el, 0);
      idleOrigin.x = pos.x;
      idleOrigin.y = pos.y;
      if (reduce.matches) return; // visible but static
      if (!idleRaf) idleRaf = requestAnimationFrame(idleTick);
    }

    function stopIdle() {
      busy = true;
      el.classList.remove("is-idle");
      if (idleRaf) {
        cancelAnimationFrame(idleRaf);
        idleRaf = 0;
      }
      if (chaseRaf) {
        cancelAnimationFrame(chaseRaf);
        chaseRaf = 0;
      }
    }

    function chaseAndGrab(packet, onMiss) {
      var t0 = performance.now();

      function frame(now) {
        if (stopped) return;
        if (
          !packet ||
          !document.body.contains(packet) ||
          packet.classList.contains("is-dormant") ||
          packet.classList.contains("is-held")
        ) {
          onMiss();
          return;
        }

        var target = packetCenter(packet);
        var op = parseFloat(getComputedStyle(packet).opacity);
        if (!(op > 0.05) || !inBand(target, riverSize())) {
          onMiss();
          return;
        }

        var dx = target.x - pos.x;
        var dy = target.y - pos.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= GRAB_RADIUS || (now - t0 > CHASE_MAX_MS && dist < 48)) {
          pos = setPos(el, target.x, target.y);
          holdPacket(packet);
          el.classList.add("is-carrying");
          setFrame(el, 1);

          var rs = riverSize();
          var analyze = {
            x: clamp(pos.x + rand(-10, 10), rs.w * 0.12, rs.w * 0.88),
            y: clamp(rs.h * rand(0.14, 0.26), 10, rs.h * 0.32)
          };

          animateTo(el, pos, analyze, LIFT_MS, function (p) {
            pos = p;
            setFrame(el, 2);
            el.classList.add("is-analyzing");

            setTimeout(function () {
              el.classList.remove("is-analyzing");
              setFrame(el, 3);
              var rs2 = riverSize();
              var drop = {
                x: clamp(pos.x + rand(-20, 20), rs2.w * 0.15, rs2.w * 0.85),
                y: rs2.h * 0.48 + rand(-4, 4)
              };
              animateTo(el, pos, drop, RETURN_MS, function (p2) {
                pos = p2;
                releasePacket(packet, drop, el);
                setFrame(el, 0);
                pos = setPos(el, drop.x, drop.y - rs2.h * 0.16);
                startIdle();
                schedule(rand(IDLE_MIN_MS, IDLE_MAX_MS));
              });
            }, rand(GLANCE_MIN_MS, GLANCE_MAX_MS));
          });
          return;
        }

        var speed = dist > 90 ? 3.6 : 2.5;
        // Lead slightly along flow (+x)
        var nx = pos.x + (dx / (dist || 1)) * speed * 2.6 + 1.2;
        var ny = pos.y + (dy / (dist || 1)) * speed * 2.6;
        pos = setPos(el, nx, ny);
        setFrame(el, 0);

        if (now - t0 > CHASE_MAX_MS) {
          onMiss();
          return;
        }
        chaseRaf = requestAnimationFrame(frame);
      }

      chaseRaf = requestAnimationFrame(frame);
    }

    function runCycle() {
      if (stopped) return;
      if (reduce.matches) {
        // No chase under reduced motion — stay visible/static
        startIdle();
        return;
      }
      stopIdle();
      el.classList.add("is-action");
      setFrame(el, 0);

      var packet = pickPacket(pos);
      if (!packet) {
        // Wait / retry — do NOT hop away empty-handed
        startIdle();
        schedule(rand(RETRY_MS_MIN, RETRY_MS_MAX));
        return;
      }

      chaseAndGrab(packet, function () {
        el.classList.remove("is-carrying", "is-analyzing");
        setFrame(el, 0);
        startIdle();
        schedule(rand(RETRY_MS_MIN, RETRY_MS_MAX));
      });
    }

    var timer = 0;
    function schedule(ms) {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(runCycle, ms);
    }

    function onReduceChange() {
      if (reduce.matches) {
        clearTimeout(timer);
        stopIdle();
        el.classList.remove("is-carrying", "is-analyzing", "is-action");
        setFrame(el, 0);
        // Keep visible (do not display:none) — static pose
        var held = container.querySelectorAll(".neon-packet.is-held");
        for (var i = 0; i < held.length; i++) {
          held[i].classList.remove("is-held");
          held[i].style.animation = "";
          held[i].style.translate = "";
          held[i].style.opacity = "";
          held[i].style.visibility = "";
        }
        startIdle();
      } else {
        startIdle();
        schedule(800 + index * 400);
      }
    }

    startIdle();
    if (!reduce.matches) {
      schedule(900 + index * STAGGER_MS + rand(0, 600));
    }

    if (typeof reduce.addEventListener === "function") {
      reduce.addEventListener("change", onReduceChange);
    } else if (typeof reduce.addListener === "function") {
      reduce.addListener(onReduceChange);
    }
  }

  for (var i = 0; i < MOTE_COUNT; i++) createMote(i);
})();
