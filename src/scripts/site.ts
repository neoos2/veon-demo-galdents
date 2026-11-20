// Small progressive enhancements. Everything works and is visible without JS.
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = window.matchMedia("(max-width: 767px)");

/* 1. Live opening status, Europe/Kyiv (B-F010). Sunday is not in the schedule → plain schedule. */
function kyivNow(): { day: number; min: number } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, min: Number(get("hour")) * 60 + Number(get("minute")) };
}
function statusText(): { text: string; open: boolean } | null {
  const { day, min } = kyivNow();
  const weekday = day >= 1 && day <= 5;
  if (weekday) {
    if (min < 570) return { text: "Сьогодні працюємо з 9:30 до 20:00", open: false };
    if (min < 1200) return { text: "Зараз працюємо — до 20:00", open: true };
    return { text: day === 5 ? "Відкриємось у суботу о 10:00" : "Відкриємось завтра о 9:30", open: false };
  }
  if (day === 6) {
    if (min < 600) return { text: "Сьогодні працюємо з 10:00 до 15:00", open: false };
    if (min < 900) return { text: "Зараз працюємо — до 15:00", open: true };
  }
  return null;
}
function renderStatus() {
  const s = statusText();
  document.querySelectorAll<HTMLElement>("[data-status]").forEach((el) => {
    const t = el.querySelector<HTMLElement>("[data-status-text]");
    if (!t) return;
    if (s) { t.textContent = s.text; el.classList.toggle("is-open", s.open); }
    el.classList.add("is-live");
  });
}
renderStatus();
setInterval(renderStatus, 60_000);

/* 2. Room tabs (WAI-ARIA tabs, arrow keys). */
const tablist = document.querySelector<HTMLElement>("[data-tabs]");
if (tablist) {
  const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>("[role=tab]"));
  const select = (tab: HTMLButtonElement, focus = false) => {
    const current = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    if (current === tab) return;
    tabs.forEach((t) => { const on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
    const next = document.getElementById(tab.getAttribute("aria-controls") ?? "");
    const prev = current ? document.getElementById(current.getAttribute("aria-controls") ?? "") : null;
    if (prev) { prev.classList.remove("is-active", "is-entering"); }
    if (next) {
      next.classList.add("is-active");
      if (!reduce) { next.classList.add("is-entering"); requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("is-entering"))); }
    }
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      const k = e.key;
      let j = -1;
      if (k === "ArrowRight") j = (i + 1) % tabs.length;
      else if (k === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
      else if (k === "Home") j = 0;
      else if (k === "End") j = tabs.length - 1;
      if (j >= 0) { e.preventDefault(); select(tabs[j], true); }
    });
  });
}

/* 3. Mobile menu (<details>): close after an anchor, on Escape. */
const mnav = document.querySelector<HTMLDetailsElement>("[data-mnav]");
if (mnav) {
  mnav.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("a[href^='#']")) mnav.open = false; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && mnav.open) { mnav.open = false; mnav.querySelector("summary")?.focus(); } });
  mnav.addEventListener("toggle", () => document.documentElement.classList.toggle("menu-open", mnav.open));
}

/* 4. Services: all open on desktop; accordion on phone with «Дитяча» open. */
const dirs = Array.from(document.querySelectorAll<HTMLDetailsElement>("[data-dir]"));
const syncDirs = () => dirs.forEach((d, i) => { d.open = mobile.matches ? i === 0 : true; });
syncDirs();
mobile.addEventListener("change", syncDirs);
dirs.forEach((d) => d.querySelector("summary")?.addEventListener("click", (e) => { if (!mobile.matches) e.preventDefault(); }));

/* 5. Copy e-mail. */
document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((b) => {
  if (!navigator.clipboard) return;
  b.hidden = false;
  const label = b.querySelector<HTMLElement>("[data-copy-label]");
  b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy ?? ""); if (label) { label.textContent = "Скопійовано"; setTimeout(() => (label.textContent = "Скопіювати"), 2000); } } catch { /* clipboard denied: address stays visible */ }
  });
});

/* 6. Header shadow, active nav item, callbar visibility. */
const header = document.querySelector<HTMLElement>("[data-header]");
const callbar = document.querySelector<HTMLElement>("[data-callbar]");
const hero = document.getElementById("top");
const footer = document.querySelector<HTMLElement>("[data-footer]");
const contactsPhones = document.querySelector<HTMLElement>("#contacts .phones");
let heroOut = false, footIn = false, phonesIn = false;
const updateBar = () => callbar?.classList.toggle("is-shown", heroOut && !footIn && !phonesIn);
if ("IntersectionObserver" in window) {
  if (hero) new IntersectionObserver(([e]) => { heroOut = !e.isIntersecting; header?.classList.toggle("is-scrolled", heroOut || window.scrollY > 8); updateBar(); }, { rootMargin: "-40% 0px 0px 0px" }).observe(hero);
  if (footer) new IntersectionObserver(([e]) => { footIn = e.isIntersecting; updateBar(); }).observe(footer);
  if (contactsPhones) new IntersectionObserver(([e]) => { phonesIn = e.isIntersecting; updateBar(); }).observe(contactsPhones);
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-nav]"));
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) links.forEach((l) => l.classList.toggle("is-active", l.hash === `#${e.target.id}`));
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["services", "approach", "clinic", "practical", "contacts"].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
}
window.addEventListener("scroll", () => header?.classList.toggle("is-scrolled", window.scrollY > 8), { passive: true });

/* 7. «Озирнутися» plays once: after it ends, drop the animation so re-layouts never replay it. */
const look = document.querySelector<HTMLElement>(".walls--look");
if (look) {
  const done = () => look.classList.add("is-looked");
  look.addEventListener("animationend", (e) => { if ((e.target as HTMLElement).closest(".walls__item:last-child") || (e as AnimationEvent).animationName === "horizon") done(); });
  setTimeout(done, 2000);
}
