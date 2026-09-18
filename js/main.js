/* Resurface Oregon — main.js (defer) */
(function () {
  "use strict";

  var doc = document;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header sticky ---------- */
  var header = doc.getElementById("site-header");
  if (header && !header.classList.contains("scrolled")) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 24);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Drawer móvil (a nivel de body, con bloqueo de scroll) ---------- */
  var toggle = doc.querySelector(".nav-toggle");
  var drawer = doc.getElementById("nav-drawer");
  if (toggle && drawer) {
    var scrim = drawer.querySelector(".drawer-scrim");
    var scrollY = 0;

    var setDrawer = function (open) {
      drawer.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) {
        scrollY = window.scrollY;
        doc.body.style.top = -scrollY + "px";
        doc.body.classList.add("nav-locked");
      } else {
        doc.body.classList.remove("nav-locked");
        doc.body.style.top = "";
        window.scrollTo(0, scrollY);
      }
    };

    toggle.addEventListener("click", function () {
      setDrawer(!drawer.classList.contains("open"));
    });
    scrim.addEventListener("click", function () { setDrawer(false); });
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setDrawer(false); });
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("open")) {
        setDrawer(false);
        toggle.focus();
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = doc.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.14 });
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- Contadores (stats) ---------- */
  var stats = doc.querySelectorAll(".stat-num[data-count]");
  if (stats.length && "IntersectionObserver" in window && !reduceMotion) {
    var animate = function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      var start = null;
      var dur = 1100;
      var tick = function (ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          animate(en.target);
          so.unobserve(en.target);
        }
      });
    }, { threshold: 0.5 });
    stats.forEach(function (el) { so.observe(el); });
  }

  /* ---------- Videos en autoplay: respetar movimiento reducido ---------- */
  doc.querySelectorAll(".hero-video, .video-frame video").forEach(function (vid) {
    vid.setAttribute("autoplay", "");
    vid.setAttribute("muted", "");
    vid.setAttribute("loop", "");
    vid.setAttribute("playsinline", "");
    if (reduceMotion) {
      vid.removeAttribute("autoplay");
      vid.pause();
    }
  });

  /* ---------- Comparador antes/después ---------- */
  doc.querySelectorAll(".ba").forEach(function (ba) {
    var range = ba.querySelector(".ba-range");
    if (!range) return;
    var apply = function (v) { ba.style.setProperty("--pos", v + "%"); };
    apply(range.value);
    range.addEventListener("input", function () { apply(range.value); });
  });

  /* ---------- Acordeón FAQ ---------- */
  doc.querySelectorAll(".faq-q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".faq-item");
      var open = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Filtros de galería ---------- */
  var filterBtns = doc.querySelectorAll(".filter-btn");
  var galItems = doc.querySelectorAll(".gal-item");
  if (filterBtns.length && galItems.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        var f = btn.getAttribute("data-filter");
        galItems.forEach(function (item) {
          var show;
          if (f === "all") {
            show = true;
          } else if (f === "videos") {
            show = item.getAttribute("data-type") === "video";
          } else {
            show = item.getAttribute("data-cat") === f;
          }
          item.classList.toggle("hidden", !show);
        });
      });
    });
  }

  /* ---------- Videos de galería: previsualización al pasar el cursor ---------- */
  doc.querySelectorAll(".gal-item video.gal-preview").forEach(function (vid) {
    var item = vid.closest(".gal-item");
    item.addEventListener("mouseenter", function () {
      if (reduceMotion) return;
      if (!vid.getAttribute("src")) {
        vid.src = item.getAttribute("data-full");
      }
      vid.play().catch(function () {});
    });
    item.addEventListener("mouseleave", function () {
      vid.pause();
      if (vid.getAttribute("src")) vid.currentTime = 0;
    });
  });

  /* ---------- Lightbox ---------- */
  var lightbox = doc.getElementById("lightbox");
  if (lightbox && galItems.length) {
    var lbImg = doc.getElementById("lightbox-img");
    var lbVid = doc.getElementById("lightbox-video");
    var lbCap = doc.getElementById("lightbox-caption");
    var current = 0;
    var visibleItems = function () {
      return Array.prototype.filter.call(galItems, function (i) {
        return !i.classList.contains("hidden");
      });
    };
    var lastFocus = null;

    var lbShowMedia = function (item) {
      var isVideo = item.getAttribute("data-type") === "video";
      if (isVideo) {
        lbImg.style.display = "none";
        lbVid.style.display = "block";
        lbVid.poster = item.querySelector("video").getAttribute("poster") || "";
        lbVid.src = item.getAttribute("data-full");
        lbVid.play().catch(function () {});
      } else {
        lbVid.pause();
        lbVid.removeAttribute("src");
        lbVid.style.display = "none";
        lbImg.style.display = "block";
        lbImg.src = item.getAttribute("data-full");
        lbImg.alt = item.querySelector("img").alt;
      }
      lbCap.textContent = item.getAttribute("data-caption") || item.querySelector("img,video").alt;
    };

    var openLb = function (item) {
      var items = visibleItems();
      current = items.indexOf(item);
      if (current < 0) return;
      lbShowMedia(item);
      lastFocus = doc.activeElement;
      lightbox.hidden = false;
      requestAnimationFrame(function () { lightbox.classList.add("open"); });
      scrollYLock();
      lightbox.querySelector(".lightbox-close").focus();
    };

    var scrollYLockVal = 0;
    var scrollYLock = function () {
      scrollYLockVal = window.scrollY;
      doc.body.style.top = -scrollYLockVal + "px";
      doc.body.classList.add("nav-locked");
    };
    var scrollUnlock = function () {
      doc.body.classList.remove("nav-locked");
      doc.body.style.top = "";
      window.scrollTo(0, scrollYLockVal);
    };

    var closeLb = function () {
      lbVid.pause();
      lightbox.classList.remove("open");
      lightbox.hidden = true;
      scrollUnlock();
      if (lastFocus) lastFocus.focus();
    };

    var move = function (dir) {
      var items = visibleItems();
      current = (current + dir + items.length) % items.length;
      lbShowMedia(items[current]);
    };

    galItems.forEach(function (item) {
      item.addEventListener("click", function () { openLb(item); });
    });
    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLb);
    lightbox.querySelector(".lightbox-nav--prev").addEventListener("click", function () { move(-1); });
    lightbox.querySelector(".lightbox-nav--next").addEventListener("click", function () { move(1); });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLb();
    });
    doc.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    });
  }

  /* ---------- Formulario de cotización ---------- */
  var form = doc.getElementById("quote-form");
  if (form) {
    var status = doc.getElementById("form-status");
    var submitBtn = doc.getElementById("submit-btn");

    var validate = function () {
      var ok = true;
      var check = function (id, test) {
        var field = doc.getElementById(id);
        var wrap = field.closest(".form-field");
        var valid = test(field.value.trim());
        wrap.classList.toggle("invalid", !valid);
        if (!valid) ok = false;
        return valid;
      };
      check("f-name", function (v) { return v.length > 1; });
      check("f-phone", function (v) { return v.replace(/\D/g, "").length >= 7; });
      check("f-email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); });
      check("f-service", function (v) { return v !== ""; });
      return ok;
    };

    form.querySelectorAll("input, select").forEach(function (el) {
      el.addEventListener("input", function () {
        var wrap = el.closest(".form-field");
        if (wrap) wrap.classList.remove("invalid");
      });
    });

    var setStatus = function (cls, html) {
      status.className = "form-status " + cls;
      status.innerHTML = html;
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";

      if (form.querySelector("#f-botcheck").checked) return; // honeypot
      if (!validate()) {
        setStatus("err", "Please review the highlighted fields.");
        var firstBad = form.querySelector(".form-field.invalid input, .form-field.invalid select");
        if (firstBad) firstBad.focus();
        return;
      }

      var key = form.querySelector('input[name="access_key"]').value.trim();
      var fields = {
        name: form.querySelector("#f-name").value.trim(),
        phone: form.querySelector("#f-phone").value.trim(),
        email: form.querySelector("#f-email").value.trim(),
        city: form.querySelector("#f-city").value.trim(),
        service: form.querySelector("#f-service").value,
        message: form.querySelector("#f-message").value.trim()
      };

      // Foto opcional: el plan gratuito de Web3Forms no adjunta archivos,
      // así que la foto se recibe por email después del envío.
      var hasPhoto = form.querySelector("#f-photo").files.length > 0;
      var photoNote = hasPhoto
        ? '<br>📎 To include your photo, email it to <a href="mailto:resurfaceoregon@gmail.com?subject=' +
          encodeURIComponent("Photo — quote request from " + fields.name) +
          '">resurfaceoregon@gmail.com</a> with your name in the subject.'
        : "";
      var message = fields.message + (hasPhoto ? "\n\n[The customer will email a photo of the surface.]" : "");

      // Sin access_key configurada: fallback inmediato a mailto
      if (!key || key.indexOf("TU_") === 0) {
        setStatus("err", mailtoHtml(fields) + photoNote +
          " <br><small>(Site owner: paste your Web3Forms access key in contact.html to send these automatically.)</small>");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          access_key: key,
          subject: "New Quote Request — resurfaceoregon.com",
          from_name: "Resurface Oregon Website",
          name: fields.name,
          phone: fields.phone,
          email: fields.email,
          city: fields.city,
          service: fields.service,
          message: message
        })
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data.success) throw new Error(data.message || "send failed");
        });
      }).then(function () {
        setStatus("ok", "<strong>Request sent!</strong> Thank you — we'll get back to you within one business day. For anything urgent, call (971) 470-5412." + photoNote);
        form.reset();
      }).catch(function () {
        // Fallback: mailto pre-llenado si el servicio falla
        setStatus("err", mailtoHtml(fields) + " or call (971) 470-5412." + photoNote);
      }).finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send My Request";
      });
    });

    function mailtoHtml(f) {
      var body = encodeURIComponent(
        "Name: " + f.name +
        "\nPhone: " + f.phone +
        "\nEmail: " + f.email +
        "\nCity: " + f.city +
        "\nService: " + f.service +
        "\n\nDetails: " + f.message
      );
      return "We couldn't send the form automatically. <a href=\"mailto:resurfaceoregon@gmail.com?subject=Quote%20Request&body=" + body + "\">Click here to send it with your email app</a>,";
    }
  }
})();
