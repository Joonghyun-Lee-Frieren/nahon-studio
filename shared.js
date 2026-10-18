"use strict";

// Shared content, platform and URL helpers for home and game detail pages.
const PLATFORM = {
  stove: { name: "STOVE", category: "pc", path: '<rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 21h8m-4-4v4m-3-12 3-2 3 2v4l-3 2-3-2V9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
  roblox: { name: "Roblox", category: "pc", categories: ["pc", "roblox"], path: '<path fill="currentColor" fill-rule="evenodd" d="M5.6 0 24 5.6 18.4 24 0 18.4 5.6 0Zm3.9 7.7-1.8 5.8 5.8 1.8 1.8-5.8-5.8-1.8Z"/>' },
  steam: { name: "Steam", category: "pc", path: '<circle cx="16.5" cy="7.5" r="4.7" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="16.5" cy="7.5" r="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m12.4 7.7-4.5 6.5 3.5 2.2 6-4.4" fill="currentColor"/><circle cx="8.5" cy="17.2" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m1 12 8.7 3.4a1.9 1.9 0 0 1-1.5 3.5L1 16" fill="currentColor"/>' },
  "app-store": { name: "App Store", category: "ios", path: '<path d="m10 3 10 17M14 3 4 20M3 15h13" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M19.5 15H22" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>' },
  "google-play": { name: "Google Play", category: "android", path: '<path d="M4 2.8v18.4L15 12z" fill="currentColor"/><path d="m5.4 2.1 12.5 7.2-2.1 2.1zM5.4 21.9l12.5-7.2-2.1-2.1zM18.8 9.8l2.2 1.3c.8.4.8 1.4 0 1.8l-2.2 1.3-2.2-2.2z" fill="currentColor"/>' }
};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (value) => String(value).padStart(2, "0");

function localURL(path) {
  if (typeof path !== "string" || !path || path.startsWith("/") || path.includes("\\") || path.split("/").includes("..")) throw new Error("Use a project-relative file path.");
  const root = new URL("./", document.baseURI);
  const url = new URL(path, root);
  if (!url.href.startsWith(root.href)) throw new Error("File path must stay inside this site.");
  return url.href;
}

function storeURL(value) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : null; } catch { return null; }
}

function gameURL(id) {
  return localURL(`game.html?id=${encodeURIComponent(id)}`);
}

// Accept video URLs, never arbitrary iframe HTML or arbitrary embed hosts.
function youtubeVideoID(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    let id = null;
    if (url.hostname === "youtu.be" && parts.length === 1) id = parts[0];
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (["embed", "shorts", "live"].includes(parts[0]) && parts.length === 2) id = parts[1];
    }
    if (["youtube-nocookie.com", "www.youtube-nocookie.com"].includes(url.hostname) && parts[0] === "embed" && parts.length === 2) id = parts[1];
    return /^[a-zA-Z0-9_-]{11}$/.test(id || "") ? id : null;
  } catch { return null; }
}

function icon(platform) {
  return `<svg class="platform-icon" viewBox="0 0 24 24" aria-hidden="true">${PLATFORM[platform].path}</svg>`;
}

function platformName(platform) {
  return `<span class="platform-name">${icon(platform)}<span>${PLATFORM[platform].name}</span></span>`;
}

function validateGame(game) {
  if (!game || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.id)) throw new Error("Invalid game id.");
  for (const key of ["title", "tagline", "description", "genre", "banner", "bannerAlt"]) {
    if (typeof game[key] !== "string" || !game[key].trim()) throw new Error(`Missing game field: ${key}`);
  }
  if (!["released", "coming-soon", "in-development"].includes(game.status)) throw new Error("Invalid game status.");
  if (typeof game.demo !== "boolean" || typeof game.featured !== "boolean") throw new Error("demo and featured must be booleans.");
  if (game.heroTitle !== undefined && typeof game.heroTitle !== "string") throw new Error("heroTitle must be text.");
  if (game.bannerFit !== undefined && !["cover", "contain"].includes(game.bannerFit)) throw new Error("bannerFit must be cover or contain.");
  if (!Array.isArray(game.platforms) || !game.platforms.length || game.platforms.some(p => !p || !Object.hasOwn(PLATFORM, p.type) || (p.url && !storeURL(p.url)))) throw new Error("Invalid game platforms.");
  localURL(game.banner);
  if (game.cover) localURL(game.cover);
  if (game.screenshots !== undefined && !Array.isArray(game.screenshots)) throw new Error("screenshots must be an array.");
  for (const shot of game.screenshots || []) {
    localURL(shot.src);
    if (typeof shot.alt !== "string" || !shot.alt.trim()) throw new Error("Screenshot alt text is required.");
  }
  for (const field of ["about", "features", "languages", "tags"]) {
    if (game[field] !== undefined && (!Array.isArray(game[field]) || game[field].some(value => typeof value !== "string" || !value.trim()))) throw new Error(`${field} must be a list of text.`);
  }
  for (const field of ["releaseDate", "developer", "players"]) {
    if (game[field] !== undefined && typeof game[field] !== "string") throw new Error(`${field} must be text.`);
  }
  if (game.videos !== undefined && !Array.isArray(game.videos)) throw new Error("videos must be an array.");
  for (const video of game.videos || []) {
    if (!video || typeof video.url !== "string" || (video.url && !youtubeVideoID(video.url))) throw new Error("Use a valid YouTube video URL.");
    if (video.title !== undefined && typeof video.title !== "string") throw new Error("Video title must be text.");
    if (video.poster) localURL(video.poster);
  }
  return game;
}

async function getJSON(path) {
  const response = await fetch(localURL(path), { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return response.json();
}

function renderStore(platform) {
  const url = storeURL(platform.url);
  if (!url) return `<span class="store-link unavailable" aria-label="${PLATFORM[platform.type].name} 링크 준비 중">${platformName(platform.type)}<small>준비 중</small></span>`;
  return `<a class="store-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" aria-label="${PLATFORM[platform.type].name}에서 보기 (새 창)">${platformName(platform.type)}<span class="store-arrow" aria-hidden="true">↗</span></a>`;
}

function screenshots(game) {
  return game.screenshots?.length ? game.screenshots : [{ src: game.banner, alt: game.bannerAlt, caption: game.demo ? "레이아웃 확인용 콘셉트 아트" : game.title }];
}

document.addEventListener("error", event => {
  if (event.target.tagName === "IMG" && !event.target.dataset.fallback) {
    event.target.dataset.fallback = "true";
    event.target.src = localURL("assets/game-placeholder.svg");
  }
}, true);

if ($("#year")) $("#year").textContent = new Date().getFullYear();
