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

  // Hero quote / tracking card: tabs, then hand the details to the contact popup
  function setupQuote(card) {
    var tabs = Array.prototype.slice.call(card.querySelectorAll(".nm-quote__tab"));
    var panels = card.querySelectorAll(".nm-quote__panel");
    var popupTrigger = card.querySelector(".nm-quote__popup");

    function selectTab(tab) {
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

    function openContact(message) {
      var box = document.querySelector(".popup.contact textarea[name='message']");
      if (box) {
        box.value = message;
        box.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (popupTrigger) popupTrigger.click();
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

  function init() {
    document.querySelectorAll("[data-nm-marquee]").forEach(setupMarquee);
    document.querySelectorAll("[data-nm-graph]").forEach(setupGraph);
    document.querySelectorAll("[data-nm-quote]").forEach(setupQuote);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
