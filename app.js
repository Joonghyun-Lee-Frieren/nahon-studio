"use strict";

// Content is intentionally independent from the layout. See docs/ADDING_GAMES.md.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const state = { games: [], featured: [], current: 0, filter: "all", timer: null, paused: reducedMotion.matches, hovering: false, loading: false };

async function loadGames() {
  if (state.loading) return;
  state.loading = true;
  $("#game-grid").setAttribute("aria-busy", "true");
  $("#content-error").hidden = true;
  try {
    const manifest = await getJSON("content/games.json");
    if (!Array.isArray(manifest.games)) throw new Error("games must be a list.");
    const results = await Promise.allSettled(manifest.games.map(async (file) => validateGame(await getJSON(file))));
    const ids = new Set();
    const games = [];
    for (const result of results) {
      if (result.status === "fulfilled" && !ids.has(result.value.id)) {
        ids.add(result.value.id);
        games.push(result.value);
      } else console.warn("Game content skipped:", result.status === "rejected" ? result.reason : "Duplicate id");
    }
    if (manifest.games.length && !games.length) throw new Error("No valid games found.");
    state.games = games;
    state.featured = games.filter(game => game.featured).slice(0, 3);
    if (!state.featured.length) state.featured = games.slice(0, 1);
    $("#demo-note").hidden = !games.some(game => game.demo);
    $("#game-count").textContent = games.length;
    renderSlides();
    renderGames();
    if (games.length < manifest.games.length) {
      const note = document.createElement("p");
      note.className = "partial-error";
      note.textContent = "일부 게임 정보를 불러오지 못했습니다. 잠시 후 페이지를 새로고침해 주세요.";
      $("#game-grid").append(note);
    }
    const hash = location.hash.slice(1);
    if (hash.startsWith("game-") && document.getElementById(hash)) requestAnimationFrame(() => document.getElementById(hash).scrollIntoView());
  } catch (error) {
    console.error(error);
    $("#content-error").hidden = false;
    $("#slides").innerHTML = '<div class="loading-state">새로운 세계를 준비하고 있습니다.</div>';
    $("#hero-controls").hidden = true;
  } finally {
    $("#game-grid").setAttribute("aria-busy", "false");
    state.loading = false;
  }
}

function renderSlides() {
  clearTimeout(state.timer);
  state.current = 0;
  $("#slides").innerHTML = state.featured.map((game, index) => `
    <article class="slide${index === 0 ? " active" : ""}" id="slide-${escapeHTML(game.id)}" role="group" aria-roledescription="슬라이드" aria-label="${index + 1} / ${state.featured.length}: ${escapeHTML(game.title)}" ${index ? 'aria-hidden="true" inert' : 'aria-hidden="false"'}>
      <img class="slide-art" src="${escapeHTML(localURL(game.banner))}" alt="${escapeHTML(game.bannerAlt)}" ${index ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async">
      <div class="slide-copy">
        <div class="slide-kicker">${pad(index + 1)} / FEATURED GAME</div>
        <h2 class="slide-title">${escapeHTML(game.heroTitle || game.title)}</h2>
        <p class="slide-tagline">${escapeHTML(game.tagline)}</p>
        <a class="hero-link" href="${escapeHTML(gameURL(game.id))}">게임 살펴보기 <span aria-hidden="true">↗</span></a>
        ${game.demo ? '<span class="hero-demo">예시 프로젝트 · 콘셉트 아트</span>' : ""}
      </div>
    </article>`).join("") || '<div class="loading-state">곧 새로운 게임으로 만나요.</div>';
  $("#slide-tabs").innerHTML = state.featured.map((game, index) => `<button type="button" class="slide-tab${index === 0 ? " active" : ""}" aria-label="${escapeHTML(game.title)} 배너 보기" aria-pressed="${index === 0}" aria-controls="slide-${escapeHTML(game.id)}" data-slide="${index}"><span class="slide-tab-number">${pad(index + 1)}</span><span class="slide-tab-title">${escapeHTML(game.title)}</span></button>`).join("");
  $("#hero-controls").hidden = state.featured.length < 2;
  $("#slide-current").textContent = "01";
  $("#slide-total").textContent = pad(state.featured.length);
  updateAutoplay();
  scheduleSlide();
}

function showSlide(index, announce = true) {
  if (!state.featured.length) return;
  state.current = (index + state.featured.length) % state.featured.length;
  $$(".slide").forEach((slide, i) => {
    const active = i === state.current;
    slide.classList.toggle("active", active);
    slide.setAttribute("aria-hidden", String(!active));
    slide.inert = !active;
  });
  $$(".slide-tab").forEach((tab, i) => {
    tab.classList.toggle("active", i === state.current);
    tab.setAttribute("aria-pressed", String(i === state.current));
  });
  $("#slide-current").textContent = pad(state.current + 1);
  if (announce) $("#slide-announcement").textContent = `${state.current + 1} / ${state.featured.length}: ${state.featured[state.current].title}`;
  scheduleSlide();
}

function scheduleSlide() {
  clearTimeout(state.timer);
  if (state.featured.length > 1 && !state.paused && !state.hovering && !document.hidden) {
    state.timer = setTimeout(() => showSlide(state.current + 1, false), 6500);
  }
}

function updateAutoplay() {
  $("#autoplay").setAttribute("aria-label", state.paused ? "배너 자동 재생 시작" : "배너 자동 재생 일시정지");
  $("#autoplay").innerHTML = `<span aria-hidden="true">${state.paused ? "▶" : "Ⅱ"}</span>`;
}

function pauseSlides() { state.paused = true; updateAutoplay(); scheduleSlide(); }

function renderGames() {
  const filtered = state.games.filter(game => state.filter === "all" || game.platforms.some(platform => (PLATFORM[platform.type].categories || [PLATFORM[platform.type].category]).includes(state.filter)));
  const statusLabels = { released: "출시", "coming-soon": "출시 예정", "in-development": "개발 중" };
  $("#game-grid").innerHTML = filtered.map(game => `
    <article class="game-card" id="game-${escapeHTML(game.id)}">
      <a class="game-cover" href="${escapeHTML(gameURL(game.id))}" aria-label="${escapeHTML(game.title)} 상세 소개 보기">
        <img src="${escapeHTML(localURL(game.cover || game.banner))}" alt="${escapeHTML(game.bannerAlt)}" loading="lazy" decoding="async" width="800" height="550">
        <span class="cover-badge">${game.demo ? "CONCEPT PREVIEW" : escapeHTML(statusLabels[game.status])}</span>
        <span class="gallery-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m4 18 5-5 3 3 4-5 4 7"/></svg>게임 살펴보기 <span aria-hidden="true">↗</span></span>
      </a>
      <div class="game-meta"><span>${escapeHTML(game.genre)}</span><span class="game-status ${game.demo ? "" : escapeHTML(game.status)}">${game.demo ? "예시 프로젝트" : escapeHTML(statusLabels[game.status])}</span></div>
      <h3 class="game-title"><a href="${escapeHTML(gameURL(game.id))}">${escapeHTML(game.title)}</a></h3>
      <p class="game-description">${escapeHTML(game.description)}</p>
      <div class="game-platforms" aria-label="${escapeHTML(game.title)} 플랫폼">${game.platforms.map(renderStore).join("")}</div>
    </article>`).join("") || '<p class="empty-state">이 플랫폼의 게임은 준비 중입니다. 곧 새로운 소식을 전해드릴게요.</p>';
}

function setFilter(filter) {
  state.filter = filter;
  $$(".filter").forEach(button => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderGames();
}

// All content event handlers are delegated, so new game files need no code changes.
$("#slide-tabs").addEventListener("click", event => {
  const button = event.target.closest("[data-slide]");
  if (button) { pauseSlides(); showSlide(Number(button.dataset.slide)); }
});
$("#slide-prev").addEventListener("click", () => { pauseSlides(); showSlide(state.current - 1); });
$("#slide-next").addEventListener("click", () => { pauseSlides(); showSlide(state.current + 1); });
$("#autoplay").addEventListener("click", () => { state.paused = !state.paused; updateAutoplay(); scheduleSlide(); });
$(".showcase").addEventListener("mouseenter", () => { state.hovering = true; scheduleSlide(); });
$(".showcase").addEventListener("mouseleave", () => { state.hovering = false; scheduleSlide(); });
$(".showcase").addEventListener("focusin", event => {
  if (!event.currentTarget.contains(event.relatedTarget) && !event.target.closest("#autoplay")) pauseSlides();
});
$(".showcase").addEventListener("keydown", event => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault(); pauseSlides(); showSlide(state.current + (event.key === "ArrowRight" ? 1 : -1));
});
let touchStart = null;
$(".showcase").addEventListener("touchstart", event => { touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }; }, { passive: true });
$(".showcase").addEventListener("touchend", event => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) { pauseSlides(); showSlide(state.current + (dx < 0 ? 1 : -1)); }
  touchStart = null;
}, { passive: true });
$(".showcase").addEventListener("touchcancel", () => { touchStart = null; });
$(".filters").addEventListener("click", event => { const button = event.target.closest("[data-filter]"); if (button) setFilter(button.dataset.filter); });
document.addEventListener("visibilitychange", scheduleSlide);
reducedMotion.addEventListener("change", () => { if (reducedMotion.matches) pauseSlides(); });
$("#retry").addEventListener("click", loadGames);
$$('[data-platform-icon]').forEach(element => { element.innerHTML = platformName(element.dataset.platformIcon); });
loadGames();
