(() => {
  const $ = (id) => document.getElementById(id);
  document.documentElement.classList.add("js");

  // Scroll reveal
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" })
    : null;
  document.querySelectorAll(".reveal").forEach((el) => io ? io.observe(el) : el.classList.add("in"));

  // Mobile nav
  const toggle = $("navToggle"), links = $("navLinks");
  const setNav = (open) => { toggle.setAttribute("aria-expanded", String(open)); links.classList.toggle("open", open); };
  toggle.addEventListener("click", () => setNav(toggle.getAttribute("aria-expanded") !== "true"));
  links.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setNav(false); });

  // Security brief: highlight the current section in the table of contents
  const tocLinks = [...document.querySelectorAll(".toc a")];
  if (tocLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(tocLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      tocLinks.forEach((a) => a.removeAttribute("aria-current"));
      byId.get(e.target.id)?.setAttribute("aria-current", "true");
    }), { rootMargin: "-20% 0px -70% 0px" });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  // Review-window demo (home page only)
  if (!$("winBody")) return;
  const body = $("winBody"), btn = $("shredBtn"), toast = $("toast"), hint = $("footHint");
  const countdown = $("countdown"), banner = $("banner");
  const START = 14 * 60 + 59;
  let left = START, timer;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const tick = () => { left = Math.max(0, left - 1); countdown.textContent = fmt(left); };
  const start = () => { clearInterval(timer); timer = setInterval(tick, 1000); };

  btn.addEventListener("click", () => {
    clearInterval(timer);
    body.classList.add("shredded");
    btn.disabled = true; btn.textContent = "Shredded";
    hint.textContent = "Verbatim transcript overwritten.";
    setTimeout(() => toast.classList.add("show"), 450);
  });
  $("replay").addEventListener("click", () => {
    toast.classList.remove("show");
    body.classList.remove("shredded");
    btn.disabled = false; btn.textContent = "Approve Memo & Shred RAM";
    hint.textContent = "Human review required before export.";
    left = START; countdown.textContent = fmt(left); start();
  });
  start();
})();
