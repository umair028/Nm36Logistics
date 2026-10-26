// NM36 sections: endless text marquee (ported from the reference "focused" section)
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setupMarquee(root) {
    var track = root.querySelector(".nm-marquee__track");
    var item = track && track.firstElementChild;
    if (!item) return;
    var duration = parseFloat(root.getAttribute("data-duration")) || 20;

    // Fill one half of the track to at least the viewport width, then duplicate the half
    // so a -50% translate loops seamlessly.
    function build() {
      track.style.animation = "none";
      while (track.children.length > 1) track.removeChild(track.lastElementChild);
      var itemWidth = item.getBoundingClientRect().width || 1;
      var perHalf = Math.max(1, Math.ceil(root.offsetWidth / itemWidth));
      for (var i = 1; i < perHalf * 2; i++) {
        var clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      }
      // Same speed as the reference: one phrase width every `duration` seconds
      track.style.setProperty("--nm-marquee-duration", duration * perHalf + "s");
      track.style.animation = "";
    }

    build();
    var lastWidth = window.innerWidth;
    window.addEventListener("resize", function () {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      build();
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

    // Only run while on screen, like the reference
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        root.classList.toggle("is-running", entries[0].isIntersecting && !reduceMotion.matches);
      }).observe(root);
    } else if (!reduceMotion.matches) {
      root.classList.add("is-running");
    }
  }

  // Nested circle graph (ported from the reference "about" section)
  function placePoint(point, degree) {
    var rad = (degree * Math.PI) / 180;
    point.style.right = 50 - 50 * Math.sin(rad) + "%";
    point.style.top = 50 - 50 * Math.cos(rad) + "%";
  }

  function setupGraph(graph) {
    var section = graph.closest(".nm-about");
    var slides = section ? section.querySelectorAll(".nm-about__fill") : [];

    function showSlide(index) {
      for (var i = 0; i < slides.length; i++) slides[i].classList.toggle("is-active", i === index);
    }

    graph.querySelectorAll(".nm-circle").forEach(function (circle) {
      var index = parseInt(circle.getAttribute("data-index"), 10) || 0;
      var center = parseFloat(circle.getAttribute("data-center")) || 0;
      var points = Array.prototype.slice.call(circle.querySelectorAll(".nm-point"));
      // Secondary points start stacked on the main one, then fan out to their own spots
      points.forEach(function (p) { placePoint(p, center); });
      var spread = false;

      function fanOut() {
        if (spread) return;
        spread = true;
        if (reduceMotion.matches) {
          points.forEach(function (p) { placePoint(p, parseFloat(p.getAttribute("data-degree"))); });
          return;
        }
        var start = performance.now();
        (function frame(now) {
          var t = Math.min(1, (now - start) / 500);
          var eased = Math.sin((t * Math.PI) / 2); // ease-out sine, as in the reference
          points.forEach(function (p) {
            var target = parseFloat(p.getAttribute("data-degree"));
            placePoint(p, center + (target - center) * eased);
          });
          if (t < 1) requestAnimationFrame(frame);
        })(start);
      }

      circle.addEventListener("mouseenter", function () {
        fanOut();
        if (index > 0) showSlide(index);
      });
      circle.addEventListener("mouseleave", function () {
        if (index > 0) showSlide(0);
      });
    });
  }

  // Opens the site's contact popup with the message box pre-filled.
  // The popup script binds to [data-popup] elements present at load, so a hidden trigger lives in the hero card.
  function openContact(message) {
    var box = document.querySelector(".popup.contact textarea[name='message']");
    if (box) {
      box.value = message;
      box.dispatchEvent(new Event("input", { bubbles: true }));
    }
    var trigger = document.querySelector(".nm-quote__popup");
    if (trigger) trigger.click();
  }

  function scrollToEl(el) {
    var top = el.getBoundingClientRect().top + window.pageYOffset - 90;
    window.scrollTo({ top: top, behavior: reduceMotion.matches ? "auto" : "smooth" });
  }

  var DAY = 864e5;
  var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getTime() + n * DAY); }
  function isoDate(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function fmtDay(d) { return WEEKDAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()]; }

  // Indicative sailing schedule; dates are relative to today so the board never looks stale.
  // Replace with the real schedule (or feed it from a booking system) before launch.
  var LANES = [
    { region: "au", from: "Nhava Sheva", fromCode: "INNSA", to: "Sydney", toCode: "AUSYD", mode: "LCL consolidation", cut: 2, dep: 4, space: "fast", origin: "Nhava Sheva (INNSA)", destination: "Sydney, Australia" },
    { region: "au", from: "Nhava Sheva", fromCode: "INNSA", to: "Melbourne", toCode: "AUMEL", mode: "FCL 40' HC", modeLabel: "FCL 20' / 40' HC", cut: 3, dep: 6, space: "open", origin: "Nhava Sheva (INNSA)", destination: "Melbourne, Australia" },
    { region: "me", from: "Nhava Sheva", fromCode: "INNSA", to: "Jebel Ali", toCode: "AEJEA", mode: "LCL consolidation", cut: 7, dep: 9, space: "fast", origin: "Nhava Sheva (INNSA)", destination: "Jebel Ali, UAE" },
    { region: "us", from: "Nhava Sheva", fromCode: "INNSA", to: "Los Angeles", toCode: "USLAX", mode: "LCL consolidation", cut: 6, dep: 9, space: "full", origin: "Nhava Sheva (INNSA)", destination: "Los Angeles, USA" },
    { region: "us", from: "Mundra", fromCode: "INMUN", to: "New York", toCode: "USNYC", mode: "FCL 40' HC", cut: 8, dep: 11, space: "open", origin: "Mundra (INMUN)", destination: "New York, USA" },
    { region: "eu", from: "Mundra", fromCode: "INMUN", to: "Felixstowe", toCode: "GBFXT", mode: "FCL 40' HC", cut: 9, dep: 12, space: "open", origin: "Mundra (INMUN)", destination: "Felixstowe, UK" },
    { region: "eu", from: "Chennai", fromCode: "INMAA", to: "Hamburg", toCode: "DEHAM", mode: "FCL 20'", cut: 10, dep: 13, space: "open", origin: "Chennai (INMAA)", destination: "Hamburg, Germany" },
    { region: "us", from: "Delhi", fromCode: "DEL", to: "New York (JFK)", toCode: "JFK", mode: "Air freight", daily: true, space: "fast", origin: "Delhi Air Cargo (DEL)", destination: "New York, USA" },
    { region: "au", from: "Nhava Sheva", fromCode: "INNSA", to: "Brisbane", toCode: "AUBNE", mode: "FCL 40' HC", cut: 13, dep: 16, space: "open", origin: "Nhava Sheva (INNSA)", destination: "Brisbane, Australia" },
  ];
  var REGIONS = [["all", "All lanes"], ["us", "USA"], ["au", "Australia"], ["eu", "UK & Europe"], ["me", "UAE & Middle East"]];
  var SPACE = { open: ["Open", "nm-pill--open"], fast: ["Filling fast", "nm-pill--fast"], full: ["Full", "nm-pill--full"] };

  var booking = null; // set by setupBooking, used by the quote card and the slot board

  function setupBoard(root) {
    var filters = root.querySelector(".nm-board__filters");
    var body = root.querySelector(".nm-board__body");
    var today = startOfDay(new Date());
    var active = "all";

    function renderFilters() {
      filters.innerHTML = REGIONS.map(function (r) {
        var count = r[0] === "all" ? LANES.length : LANES.filter(function (l) { return l.region === r[0]; }).length;
        return '<button type="button" class="nm-chip' + (r[0] === active ? " is-active" : "") + '" data-region="' + r[0] + '" aria-pressed="' + (r[0] === active) + '">' + r[1] + " (" + count + ")</button>";
      }).join("");
    }

    function renderRows() {
      var rows = LANES.map(function (l, i) { return [l, i]; }).filter(function (p) { return active === "all" || p[0].region === active; });
      if (!rows.length) {
        body.innerHTML = '<p class="nm-board__empty">No scheduled sailings on this lane right now. Ask us about a custom booking.</p>';
        return;
      }
      body.innerHTML = rows.map(function (p, r) {
        var l = p[0];
        var cut = l.daily ? "Daily 14:00" : fmtDay(addDays(today, l.cut));
        var dep = l.daily ? "Daily" : fmtDay(addDays(today, l.dep));
        var sp = SPACE[l.space];
        // capacity bar: how much of the sailing is already booked
        var fill = l.space === "full" ? 100 : l.space === "fast" ? 82 + (p[1] % 3) * 4 : 34 + (p[1] % 4) * 8;
        var btn = l.space === "full"
          ? '<button type="button" class="nm-board__btn nm-board__btn--wait" data-lane="' + p[1] + '" data-act="wait">Join waitlist</button>'
          : '<button type="button" class="nm-board__btn" data-lane="' + p[1] + '" data-act="book">Book slot</button>';
        return '<div class="nm-board__row" role="row" style="--r:' + r + '">' +
          '<div class="nm-board__lane" role="cell"><strong>' + l.from + " → " + l.to + "</strong><span>" + l.fromCode + " → " + l.toCode + "</span></div>" +
          '<div role="cell"><span class="nm-board__label">Mode</span>' + (l.modeLabel || l.mode) + "</div>" +
          '<div role="cell"><span class="nm-board__label">Cut-off</span>' + cut + "</div>" +
          '<div role="cell"><span class="nm-board__label">Departs</span>' + dep + "</div>" +
          '<div role="cell"><span class="nm-pill ' + sp[1] + '">' + sp[0] + '</span><span class="nm-cap nm-cap--' + l.space + '" title="' + fill + '% booked"><i style="--fill:' + fill + '%"></i></span></div>' +
          btn + "</div>";
      }).join("");
    }

    filters.addEventListener("click", function (e) {
      var b = e.target.closest(".nm-chip");
      if (!b) return;
      active = b.getAttribute("data-region");
      renderFilters();
      renderRows();
    });
    body.addEventListener("click", function (e) {
      var b = e.target.closest(".nm-board__btn");
      if (!b) return;
      var l = LANES[+b.getAttribute("data-lane")];
      if (b.getAttribute("data-act") === "wait") {
        openContact("Waitlist request\nLane: " + l.from + " → " + l.to + " (" + l.fromCode + " → " + l.toCode + ")\nMode: " + (l.modeLabel || l.mode));
        return;
      }
      if (booking) {
        // pickup must happen before the cut-off
        booking.prefill({ origin: l.origin, destination: l.destination, mode: l.mode, lane: l, step: 3 });
      }
    });

    renderFilters();
    renderRows();
  }

  function setupBooking(root) {
    var form = root.querySelector("form");
    var panels = Array.prototype.slice.call(root.querySelectorAll(".nm-book__panel"));
    var stepEls = root.querySelectorAll(".nm-book__step");
    var back = root.querySelector('[data-act="back"]');
    var next = root.querySelector('[data-act="next"]');
    var count = root.querySelector(".nm-book__count");
    var error = root.querySelector(".nm-book__error");
    var daysEl = root.querySelector(".nm-cal__days");
    var winsEl = root.querySelector(".nm-cal__windows");
    var rangeEl = root.querySelector(".nm-cal__range");
    var etaEl = root.querySelector(".nm-cal__eta");
    var review = root.querySelector(".nm-book__review");
    var sum = {};
    root.querySelectorAll("[data-sum]").forEach(function (el) { sum[el.getAttribute("data-sum")] = el; });

    var step = 1;
    var picked = { date: null, window: null, lane: null };
    var WINDOWS = [["09:00 – 12:00", "Morning"], ["12:00 – 15:00", "Afternoon"], ["15:00 – 18:00", "Evening"]];

    // Selects reuse the hero card's option lists so both stay in sync
    root.querySelectorAll("select[data-source]").forEach(function (sel) {
      var src = document.getElementById(sel.getAttribute("data-source"));
      if (src) sel.innerHTML = src.innerHTML;
    });

    function val(name) {
      var el = form.elements[name];
      if (!el) return "";
      if (el.length && el[0] && el[0].type === "radio") {
        for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value;
        return "";
      }
      return el.type === "checkbox" ? el.checked : el.value;
    }
    function setVal(name, value) {
      if (value == null) return;
      var el = form.elements[name];
      if (!el) return;
      if (el.length && el[0] && el[0].type === "radio") {
        for (var i = 0; i < el.length; i++) el[i].checked = el[i].value === value;
        return;
      }
      for (var j = 0; el.options && j < el.options.length; j++) {
        if (el.options[j].value === value || el.options[j].text === value) { el.selectedIndex = j; return; }
      }
      if (!el.options) el.value = value;
    }
    function split(place) {
      // "Nhava Sheva (INNSA)" -> code + name; "Sydney, Australia" -> code from lane or initials
      var m = /^(.*)\s\(([A-Z]{3,5})\)$/.exec(place);
      return m ? { name: m[1], code: m[2] } : { name: place, code: null };
    }

    // ----- pickup calendar: 14 days from tomorrow; Sundays closed -----
    function slotStatus(d) {
      if (d.getDay() === 0) return "closed";
      var n = (d.getDate() * 7 + d.getMonth() * 3) % 10;
      return n < 2 ? "full" : n < 5 ? "limited" : "open";
    }
    function renderCalendar() {
      var start = addDays(startOfDay(new Date()), 1);
      var last = picked.lane && !picked.lane.daily ? addDays(startOfDay(new Date()), picked.lane.cut) : null;
      var days = [];
      for (var i = 0; i < 14; i++) days.push(addDays(start, i));
      rangeEl.textContent = fmtDay(days[0]) + " – " + fmtDay(days[13]);
      daysEl.innerHTML = days.map(function (d, i) {
        var st = slotStatus(d);
        var afterCut = last && d > last;
        var off = st === "full" || st === "closed" || afterCut;
        var label = afterCut ? "After cut-off" : st === "closed" ? "Closed" : st === "full" ? "Full" : st === "limited" ? "Limited" : "Open";
        var iso = isoDate(d);
        return '<button type="button" role="radio" class="nm-day is-' + st + '" style="--r:' + i + '" data-date="' + iso + '" aria-checked="' + (picked.date === iso) + '"' + (off ? " disabled" : "") +
          ' aria-label="' + fmtDay(d) + ", " + label + '"><span>' + WEEKDAYS[d.getDay()] + "</span><strong>" + d.getDate() + "</strong><span>" + label + "</span></button>";
      }).join("");
      renderWindows();
    }
    function renderWindows() {
      var d = picked.date ? new Date(picked.date + "T00:00:00") : null;
      var limited = d && slotStatus(d) === "limited";
      winsEl.innerHTML = WINDOWS.map(function (w, i) {
        var off = !d || (limited && i === 2);
        return '<button type="button" role="radio" class="nm-win" data-window="' + w[0] + '" aria-checked="' + (picked.window === w[0]) + '"' + (off ? " disabled" : "") +
          "><strong>" + w[0] + "</strong><span>" + w[1] + " · " + (off && d ? "unavailable" : d ? "available" : "pick a date first") + "</span></button>";
      }).join("");
      if (d) {
        var dep = picked.lane && !picked.lane.daily ? addDays(startOfDay(new Date()), picked.lane.dep) : addDays(d, val("mode") === "Air freight" ? 1 : 4);
        var originCode = split(val("origin")).code || "origin";
        etaEl.textContent = "Est. " + (val("mode") === "Air freight" ? "flight" : "vessel") + " departure: " + fmtDay(dep) + " from " + originCode;
      } else {
        etaEl.textContent = "";
      }
    }
    daysEl.addEventListener("click", function (e) {
      var b = e.target.closest(".nm-day");
      if (!b || b.disabled) return;
      picked.date = b.getAttribute("data-date");
      if (picked.window && slotStatus(new Date(picked.date + "T00:00:00")) === "limited" && picked.window === WINDOWS[2][0]) picked.window = null;
      renderCalendar();
      update();
    });
    winsEl.addEventListener("click", function (e) {
      var b = e.target.closest(".nm-win");
      if (!b || b.disabled) return;
      picked.window = b.getAttribute("data-window");
      renderWindows();
      update();
    });

    // ----- summary + review -----
    function details() {
      var o = split(val("origin"));
      var dest = val("destination");
      return [
        ["Mode", val("mode")],
        ["Service", val("service")],
        ["Route", (o.code || o.name) + " → " + dest],
        ["Cargo", val("cargo")],
        ["Incoterm", val("incoterm")],
        ["Volume / weight", val("volume") || "To be confirmed"],
        ["Packages", val("packages") || "To be confirmed"],
        ["Pickup date", picked.date ? fmtDay(new Date(picked.date + "T00:00:00")) : "Not selected"],
        ["Time window", picked.window || "Not selected"],
        ["Insurance", val("insurance") ? "All-risk cover requested" : "Not added"],
      ];
    }
    var ready = false;
    function setSum(key, text) {
      var el = sum[key];
      if (el.textContent === text) return;
      el.textContent = text;
      // briefly highlight values that just changed (not on first paint)
      if (ready && el.tagName === "DD") {
        el.classList.remove("is-updated");
        void el.offsetWidth;
        el.classList.add("is-updated");
      }
    }
    function update() {
      var o = split(val("origin"));
      var dest = val("destination");
      var destCode = picked.lane && picked.lane.destination === dest ? picked.lane.toCode : dest.split(",")[0].slice(0, 3).toUpperCase();
      setSum("originCode", o.code || o.name.slice(0, 3).toUpperCase());
      setSum("originName", o.name);
      setSum("destCode", destCode);
      setSum("destName", dest);
      setSum("mode", val("mode") || "Not selected");
      setSum("service", val("service") || "Not selected");
      setSum("cargo", val("cargo") || "Not selected");
      setSum("incoterm", val("incoterm") || "Not selected");
      setSum("date", picked.date ? fmtDay(new Date(picked.date + "T00:00:00")) : "Not selected");
      setSum("window", picked.window || "Not selected");
      setSum("insurance", val("insurance") ? "Added" : "Not added");
      review.innerHTML = details().map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("");
    }
    form.addEventListener("change", function (e) {
      if (e.target.name === "origin" || e.target.name === "destination") {
        // a manual route change detaches the board's sailing (and its cut-off)
        if (picked.lane && (val("origin") !== picked.lane.origin || val("destination") !== picked.lane.destination)) {
          picked.lane = null;
          renderCalendar();
        }
      }
      if (e.target.name === "mode") renderWindows();
      update();
    });
    form.addEventListener("input", update);

    // ----- steps -----
    function showError(msg) {
      error.textContent = msg;
      error.hidden = !msg;
    }
    function go(n) {
      step = Math.max(1, Math.min(5, n));
      panels.forEach(function (p) {
        var on = +p.getAttribute("data-panel") === step;
        p.hidden = !on;
        p.classList.toggle("is-active", on);
      });
      stepEls.forEach(function (s) {
        var k = +s.getAttribute("data-step");
        s.classList.toggle("is-current", k === step);
        s.classList.toggle("is-done", k < step);
      });
      var bar = root.querySelector(".nm-book__progress");
      if (bar) bar.style.setProperty("--p", (step / 5) * 100 + "%");
      back.disabled = step === 1;
      next.textContent = step === 5 ? "Send booking request" : "Continue";
      count.textContent = "Step " + step + " of 5";
      showError("");
      if (step === 4) renderCalendar();
      update();
    }
    function validate() {
      if (step === 1 && (!val("mode") || !val("service"))) return "Choose a freight mode and service level.";
      if (step === 2 && (!val("origin") || !val("destination"))) return "Choose an origin and a destination.";
      if (step === 3 && !val("cargo")) return "Choose a cargo category.";
      if (step === 4 && (!picked.date || !picked.window)) return "Pick a pickup date and a time window.";
      return "";
    }
    next.addEventListener("click", function () {
      var msg = validate();
      if (msg) { showError(msg); return; }
      if (step < 5) { go(step + 1); return; }
      openContact("Slot booking request\n" + details().map(function (r) { return r[0] + ": " + r[1]; }).join("\n"));
    });
    back.addEventListener("click", function () { go(step - 1); });
    // Enter in a field moves on instead of submitting (and reloading) the page
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      next.click();
    });

    booking = {
      prefill: function (o) {
        setVal("origin", o.origin);
        setVal("destination", o.destination);
        setVal("cargo", o.cargo);
        setVal("mode", o.mode);
        picked.lane = o.lane || null;
        picked.window = null;
        picked.date = null;
        if (o.date) {
          var d = new Date(o.date + "T00:00:00");
          var st = slotStatus(d);
          var tomorrow = addDays(startOfDay(new Date()), 1);
          if (d >= tomorrow && d < addDays(tomorrow, 14) && st !== "full" && st !== "closed") picked.date = o.date;
        }
        go(o.step || 1);
        scrollToEl(root);
      },
    };
    go(1);
    ready = true;
  }

  // Scroll reveal: [data-nm-reveal] fades/slides in once (styles only apply under .nm-js)
  function setupReveal() {
    var els = document.querySelectorAll("[data-nm-reveal]");
    if (!("IntersectionObserver" in window) || reduceMotion.matches) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  // Route map: hovering a market highlights its lane; while idle and on screen it cycles through them
  function setupMap(map) {
    var items = Array.prototype.slice.call(map.querySelectorAll("[data-market]"));
    var svg = map.querySelector("svg");
    var timer = null, idx = -1, hovering = false, visible = false;

    function activate(key) {
      if (key) map.setAttribute("data-active", key);
      else map.removeAttribute("data-active");
      items.forEach(function (li) { li.classList.toggle("is-active", li.getAttribute("data-market") === key); });
    }
    function tick() {
      idx = (idx + 1) % items.length;
      activate(items[idx].getAttribute("data-market"));
    }
    function startCycle() {
      if (timer || hovering || !visible || reduceMotion.matches) return;
      timer = setInterval(tick, 2600);
    }
    function stopCycle() {
      clearInterval(timer);
      timer = null;
    }

    items.forEach(function (li, i) {
      var key = li.getAttribute("data-market");
      function on() { hovering = true; stopCycle(); idx = i; activate(key); }
      function off() { hovering = false; activate(null); startCycle(); }
      li.addEventListener("mouseenter", on);
      li.addEventListener("mouseleave", off);
      li.addEventListener("focus", on);
      li.addEventListener("blur", off);
    });
    map.querySelectorAll("[data-node]").forEach(function (node) {
      var key = node.getAttribute("data-node");
      node.addEventListener("mouseenter", function () { hovering = true; stopCycle(); activate(key); });
      node.addEventListener("mouseleave", function () { hovering = false; activate(null); startCycle(); });
    });

    if (reduceMotion.matches && svg && svg.pauseAnimations) svg.pauseAnimations();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) {
          // let the lanes draw in before the highlight starts moving
          setTimeout(startCycle, 2400);
          if (svg && svg.unpauseAnimations && !reduceMotion.matches) svg.unpauseAnimations();
        } else {
          stopCycle();
          activate(null);
          if (svg && svg.pauseAnimations) svg.pauseAnimations();
        }
      }, { threshold: 0.25 }).observe(map);
    }
  }

  // Hero quote / tracking card: tabs; a quote continues in the booking flow, tracking opens the contact popup
  function setupQuote(card) {
    var tabs = Array.prototype.slice.call(card.querySelectorAll(".nm-quote__tab"));
    var panels = card.querySelectorAll(".nm-quote__panel");

    var tabBar = card.querySelector(".nm-quote__tabs");
    function selectTab(tab) {
      if (tabBar) tabBar.setAttribute("data-active", tab.getAttribute("data-tab"));
      tabs.forEach(function (t) {
        var active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
        t.tabIndex = active ? 0 : -1;
      });
      for (var i = 0; i < panels.length; i++) {
        var show = panels[i].getAttribute("data-panel") === tab.getAttribute("data-tab");
        panels[i].hidden = !show;
        panels[i].classList.toggle("is-active", show);
      }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { selectTab(tab); });
      tab.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        selectTab(next);
        next.focus();
      });
    });

    // Ready date: no past dates, default two weeks out
    var date = card.querySelector('input[type="date"]');
    if (date) {
      var iso = function (d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
      var today = new Date();
      date.min = iso(today);
      if (!date.value) date.value = iso(new Date(today.getTime() + 14 * 864e5));
    }

    card.querySelectorAll("form").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var missing = Array.prototype.filter.call(form.querySelectorAll("[required]"), function (el) {
          var bad = !el.value.trim() || (el.min && el.type === "date" && el.value < el.min);
          el.classList.toggle("is-invalid", bad);
          return bad;
        });
        if (missing.length) {
          missing[0].focus();
          return;
        }
        // A quote request continues in the booking flow, pre-filled and at the pickup step
        if (form.getAttribute("data-panel") === "quote" && booking) {
          booking.prefill({
            origin: form.elements.origin.value,
            destination: form.elements.destination.value,
            cargo: form.elements.cargo.value,
            mode: form.elements.load.value,
            date: form.elements.date.value,
            step: 4,
          });
          return;
        }
        var lines = Array.prototype.map.call(form.querySelectorAll(".nm-quote__field"), function (f) {
          var label = f.querySelector("label").textContent;
          return label + ": " + f.querySelector(".nm-quote__input").value;
        });
        var title = form.getAttribute("data-panel") === "track" ? "Tracking request" : "Quote request";
        openContact(title + "\n" + lines.join("\n"));
      });
      form.addEventListener("input", function (e) {
        if (e.target.classList) e.target.classList.remove("is-invalid");
      });
    });
  }

  // The site's scroll timeline only lifts the hero headline (yPercent -65), so the eyebrow above it
  // got covered and the intro below was left behind. Mirror the headline's offset onto both.
  function setupHeroSync() {
    var title = document.querySelector(".home-hero .home-hero__title");
    var followers = document.querySelectorAll(".nm-hero-eyebrow, .nm-hero-lead");
    if (!title || !followers.length) return;
    var last = null;
    (function frame() {
      requestAnimationFrame(frame);
      if (window.pageYOffset > window.innerHeight * 2.5) return; // hero is long gone
      var m = new DOMMatrixReadOnly(getComputedStyle(title).transform);
      var y = Math.round(m.m42 * 10) / 10;
      if (y !== last) {
        last = y;
        for (var i = 0; i < followers.length; i++) followers[i].style.transform = y ? "translate3d(0," + y + "px,0)" : "";
      }
    })();
  }

  function init() {
    setupHeroSync();
    document.querySelectorAll("[data-nm-marquee]").forEach(setupMarquee);
    document.querySelectorAll("[data-nm-graph]").forEach(setupGraph);
    document.querySelectorAll("[data-nm-book]").forEach(setupBooking);
    document.querySelectorAll("[data-nm-board]").forEach(setupBoard);
    document.querySelectorAll("[data-nm-quote]").forEach(setupQuote);
    document.querySelectorAll("[data-nm-map]").forEach(setupMap);
    setupReveal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
