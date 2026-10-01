(function () {
  var river = document.querySelector(".hero-neon-river");
  if (!river) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var container = river.querySelector(".neon-packets");
  if (!container) return;

  var MOTE_COUNT = 2;
  var GLANCE_MIN_MS = 800;
  var GLANCE_MAX_MS = 1400;
  var WAIT_AHEAD_MAX_MS = 6000;
  var LEAD_PX = 40;
  var GRAB_RADIUS = 13;
  var LIFT_MS = 450;
  var RETURN_MS = 950;
  var STAGGER_MS = 2800;
  var RETRY_MS_MIN = 500;
  var RETRY_MS_MAX = 1200;
  var BETWEEN_MS_MIN = 2500;
  var BETWEEN_MS_MAX = 6000;
  var SLOT_MS = 380; // move into ahead slot, then HOLD

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

  function riverAngle() {
    var tr = getComputedStyle(river).transform;
    if (!tr || tr === "none") return 0;
    var m = new DOMMatrixReadOnly(tr);
    return Math.atan2(m.b, m.a);
  }

  function packetCenter(el) {
    var pr = el.getBoundingClientRect();
    var rr = river.getBoundingClientRect();
    var pcx = pr.left + pr.width / 2;
    var pcy = pr.top + pr.height / 2;
    var rcx = rr.left + rr.width / 2;
    var rcy = rr.top + rr.height / 2;
    var dx = pcx - rcx;
    var dy = pcy - rcy;
    var ang = -riverAngle();
    var cos = Math.cos(ang);
    var sin = Math.sin(ang);
    return {
      x: river.clientWidth / 2 + (dx * cos - dy * sin),
      y: river.clientHeight / 2 + (dx * sin + dy * cos)
    };
  }

  function inFlowBand(cs, rs) {
    return (
      cs.x >= rs.w * 0.06 &&
      cs.x <= rs.w * 0.92 &&
      cs.y >= rs.h * 0.28 &&
      cs.y <= rs.h * 0.72
    );
  }

  function activePackets() {
    var all = container.querySelectorAll(".neon-packet");
    var out = [];
    var rs = riverSize();
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.classList.contains("is-dormant") || el.classList.contains("is-held")) continue;
      var op = parseFloat(getComputedStyle(el).opacity);
      if (!(op > 0.05)) continue;
      var cs = packetCenter(el);
      if (!inFlowBand(cs, rs)) continue;
      out.push(el);
    }
    return out;
  }

  function pickPacket(moteX) {
    var list = activePackets();
    if (!list.length) return null;
    var rs = riverSize();
    var best = null;
    var bestScore = Infinity;
    for (var i = 0; i < list.length; i++) {
      var c = packetCenter(list[i]);
      if (c.x > rs.w * 0.72) continue;
      if (c.x + LEAD_PX > rs.w * 0.9) continue;
      var score = Math.abs(c.y - rs.h * 0.48) * 2 + (c.x < moteX ? 0 : 50) + c.x * 0.01;
      if (score < bestScore) {
        bestScore = score;
        best = list[i];
      }
    }
    if (best) return best;
    for (var j = 0; j < list.length; j++) {
      var c2 = packetCenter(list[j]);
      if (c2.x + LEAD_PX < rs.w * 0.9) return list[j];
    }
    return null;
  }

  function setPos(el, x, y) {
    var rs = riverSize();
    x = clamp(x, 12, rs.w - 12);
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
    var cx = (from.x + to.x) / 2;
    var cy = (from.y + to.y) / 2 - rand(2, 8);

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
      rand(rs0.w * 0.35, rs0.w * 0.55) + index * 80,
      rs0.h * 0.48 + rand(-3, 3)
    );

    var waitRaf = 0;
    var busy = false;
    var stopped = false;

    function stopWait() {
      if (waitRaf) {
        cancelAnimationFrame(waitRaf);
        waitRaf = 0;
      }
    }

    function holdStation() {
      el.classList.add("is-idle");
      el.classList.remove("is-carrying", "is-action", "is-analyzing", "is-waiting-ahead");
      setFrame(el, 0);
      busy = false;
    }

    /**
     * Station AHEAD of ball on pipe → HOLD until collide → grab → analyze → return → wait next.
     */
    function waitAheadAndGrab(packet, onMiss) {
      var rs = riverSize();
      var target0 = packetCenter(packet);
      var slot = {
        x: clamp(target0.x + LEAD_PX, rs.w * 0.12, rs.w * 0.88),
        y: clamp(target0.y, rs.h * 0.42, rs.h * 0.56)
      };

      el.classList.add("is-action");
      el.classList.remove("is-idle");
      setFrame(el, 0);

      // Move into ahead slot, then freeze there
      animateTo(el, pos, slot, SLOT_MS, function (p) {
        pos = p;
        el.classList.add("is-waiting-ahead");
        var station = { x: pos.x, y: pos.y };
        var t0 = performance.now();

        function frame(now) {
          if (stopped) return;
          if (
            !packet ||
            !document.body.contains(packet) ||
            packet.classList.contains("is-dormant") ||
            packet.classList.contains("is-held")
          ) {
            el.classList.remove("is-waiting-ahead");
            onMiss();
            return;
          }

          var target = packetCenter(packet);
          var op = parseFloat(getComputedStyle(packet).opacity);
          if (!(op > 0.05) || !inFlowBand(target, riverSize())) {
            el.classList.remove("is-waiting-ahead");
            onMiss();
            return;
          }

          // Stay parked ahead — only micro Y align to pipe, do NOT chase +x
          station.y = station.y + (clamp(target.y, rs.h * 0.42, rs.h * 0.56) - station.y) * 0.08;
          pos = setPos(el, station.x, station.y);

          var dx = target.x - pos.x;
          var dy = target.y - pos.y;
          var dist = Math.sqrt(dx * dx + dy * dy);

          // Collision when ball reaches the parked mote
          var collided =
            dist <= GRAB_RADIUS ||
            (target.x >= pos.x - 6 && Math.abs(dy) < 14);

          if (collided) {
            el.classList.remove("is-waiting-ahead");
            pos = setPos(el, target.x, target.y);
            holdPacket(packet);
            el.classList.add("is-carrying");
            setFrame(el, 1);

            var rs2 = riverSize();
            var analyze = {
              x: clamp(pos.x + rand(-8, 8), rs2.w * 0.12, rs2.w * 0.88),
              y: clamp(rs2.h * rand(0.12, 0.24), 8, rs2.h * 0.3)
            };

            animateTo(el, pos, analyze, LIFT_MS, function (p2) {
              pos = p2;
              setFrame(el, 2);
              el.classList.add("is-analyzing");

              setTimeout(function () {
                el.classList.remove("is-analyzing");
                setFrame(el, 3);
                var rs3 = riverSize();
                var drop = {
                  x: clamp(pos.x + rand(-16, 16), rs3.w * 0.15, rs3.w * 0.85),
                  y: rs3.h * 0.48 + rand(-3, 3)
                };
                animateTo(el, pos, drop, RETURN_MS, function (p3) {
                  pos = p3;
                  releasePacket(packet, drop, el);
                  setFrame(el, 0);
                  pos = setPos(el, drop.x, rs3.h * 0.48);
                  holdStation();
                  schedule(rand(BETWEEN_MS_MIN, BETWEEN_MS_MAX));
                });
              }, rand(GLANCE_MIN_MS, GLANCE_MAX_MS));
            });
            return;
          }

          if (now - t0 > WAIT_AHEAD_MAX_MS) {
            el.classList.remove("is-waiting-ahead");
            onMiss();
            return;
          }
          waitRaf = requestAnimationFrame(frame);
        }

        waitRaf = requestAnimationFrame(frame);
      });
    }

    function runCycle() {
      if (stopped) return;
      if (reduce.matches) {
        holdStation();
        return;
      }
      if (busy) return;
      busy = true;
      stopWait();

      var packet = pickPacket(pos.x);
      if (!packet) {
        holdStation();
        schedule(rand(RETRY_MS_MIN, RETRY_MS_MAX));
        return;
      }

      waitAheadAndGrab(packet, function () {
        holdStation();
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
        stopWait();
        busy = false;
        el.classList.remove("is-carrying", "is-analyzing", "is-action", "is-waiting-ahead");
        var held = container.querySelectorAll(".neon-packet.is-held");
        for (var i = 0; i < held.length; i++) {
          held[i].classList.remove("is-held");
          held[i].style.animation = "";
          held[i].style.translate = "";
          held[i].style.opacity = "";
          held[i].style.visibility = "";
        }
        holdStation();
      } else {
        holdStation();
        schedule(700 + index * 500);
      }
    }

    holdStation();
    if (!reduce.matches) {
      schedule(700 + index * STAGGER_MS + rand(0, 500));
    }

    if (typeof reduce.addEventListener === "function") {
      reduce.addEventListener("change", onReduceChange);
    } else if (typeof reduce.addListener === "function") {
      reduce.addListener(onReduceChange);
    }
  }

  for (var i = 0; i < MOTE_COUNT; i++) createMote(i);
})();
