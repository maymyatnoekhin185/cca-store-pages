/* Carpet Court store pages prototype: router, Store Locator, Store Details, overlays. */
(() => {
  "use strict";
  const D = window.CC_DATA;
  const app = document.getElementById("app");
  const overlayRoot = document.getElementById("overlay-root");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mq = window.matchMedia("(max-width: 1023px)");
  const isMobile = () => mq.matches;
  const icon = (name, w = 24, h = w, alt = "") => `<img src="assets/icons/${name}" alt="${alt}" width="${w}" height="${h}" />`;
  const storeById = (id) => D.STORES.find((s) => s.id === id);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const store = (k, v) => { try { v === undefined ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const load = (k, d) => { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };

  /* ================= State ================= */
  const L = Object.assign({
    query: "", searchedLabel: "", region: "all", status: "ready", view: "list",
    filters: { services: [], states: [], weekends: [] }, sort: "soonest",
    selectedId: "nelson-bay", loc: "idle", showAll: false,
  }, load("cc-locator", {}));
  if (L.status === "loading") L.status = "ready";
  let failNext = false;
  let openDrop = null; // "services" | "states" | "weekends" | "all" | "sort"
  let draft = null;
  let suggestIdx = -1;
  let recent = (() => { try { return JSON.parse(localStorage.getItem("cc-recent")) || D.RECENT_SEED; } catch { return D.RECENT_SEED; } })();
  const saveL = () => store("cc-locator", L);

  const DS = { month: 8, year: 2026, day: 8, time: null, playing: false };

  /* ================= Router ================= */
  function route() {
    closeOverlays();
    $$(".ftr__col").forEach((d) => (d.open = !isMobile())); // footer link groups fold away on mobile
    const h = location.hash.replace(/^#/, "") || "/";
    const m = h.match(/^\/store\/([\w-]+)/);
    const cm = h.match(/[?&]card=(\w+)/); // review links, e.g. #/?card=d
    if (cm && CARD_STYLES.some(([k]) => k === cm[1])) { cardStyle = cm[1]; try { localStorage.setItem("cc-card", cardStyle); } catch {} }
    document.body.classList.remove("has-mcta");
    if (m) renderDetails(m[1]);
    else { L.view = h.startsWith("/map") ? "map" : "list"; saveL(); renderLocator(); }
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
    if (m && /#book$/.test(h)) setTimeout(() => scrollToId("book"), 60); // "More times" deep link
  }
  {
  }
  window.addEventListener("hashchange", route);

  /* ================= Store Locator ================= */
  function resultsList() {
    if (L.region === "none") return [];
    const f = L.filters;
    let list = D.STORES.filter((s) =>
      f.services.every((x) => s.services.includes(x)) &&
      (f.states.length === 0 || f.states.includes(s.state)) &&
      (!f.weekends.includes("sat") || s.sat) && (!f.weekends.includes("sun") || s.sun));
    const by = { nearest: (a, b) => a.km - b.km, rated: (a, b) => b.rating - a.rating || b.reviews - a.reviews, soonest: (a, b) => a.slot - b.slot || a.km - b.km };
    return list.sort(by[L.sort]);
  }
  const filterCount = () => L.filters.services.length + L.filters.states.length + L.filters.weekends.length;

  function renderLocator() {
    document.title = "Find a store | Carpet Court";
    const split = L.view === "map" && !isMobile();
    app.innerHTML = `
      <div class="${split ? "loc-split" : ""}">
        <section class="loc ${split ? "" : "wrap"}" ${split ? 'style="padding-left:32px"' : ""} aria-labelledby="loc-title">
          <h1 id="loc-title" class="loc__title">Find a store</h1>
          <form class="loc__bar" id="loc-form" role="search" autocomplete="off" novalidate>
            <div class="loc__search-row">
              <div class="searchbox" id="searchbox">
                <div class="searchbox__field">
                  ${icon("magnifying-glass.svg", 20)}
                  <label class="sr-only" for="loc-q">Suburb or postcode</label>
                  <input id="loc-q" type="text" enterkeyhint="search" placeholder="Enter your suburb or postcode" value="${esc(L.query)}" role="combobox" aria-expanded="false" aria-controls="suggest" aria-autocomplete="list" />
                  <button type="button" class="searchbox__clear" data-action="clear-q" aria-label="Clear search" ${L.query ? "" : "hidden"}>${icon("close.svg", 20)}</button>
                </div>
                <div id="suggest" class="suggest" role="listbox" aria-label="Suggestions" hidden></div>
              </div>
              <div class="loc__actions">
                <button type="submit" class="btn btn--primary btn--search">Search</button>
                <span id="locbtn-slot"></span>
              </div>
            </div>
            <button type="button" class="btn btn--secondary btn--icon-right btn--map-desktop" data-action="toggle-view">${L.view === "map" ? `List view ${listIcon()}` : `Map view ${icon("map-trifold.svg")}`}</button>
          </form>
          <div class="loc__mobile-row" id="mobile-row"></div>
          <div id="notice"></div>
          <div id="rh"></div>
          <div id="map-mobile"></div>
          <div id="results" aria-live="polite" aria-busy="false"></div>
        </section>
        ${split ? '<div id="map-desktop"></div>' : ""}
      </div>`;
    updateLocator();
  }
  const listIcon = () => `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="#63666A" stroke-width="2" stroke-linecap="round"/></svg>`;

  function updateLocator() {
    if (!$("#loc-form")) return;
    renderLocBtn(); renderMobileRow(); renderNotice(); renderRH(); renderMap(); renderResults(); saveL();
  }

  function renderLocBtn() {
    const slot = $("#locbtn-slot"); if (!slot) return;
    const st = L.loc;
    const cls = st === "locating" ? "is-loading" : st === "success" ? "is-located" : "";
    const ic = st === "locating" ? `<img class="spin" src="assets/icons/spinner.svg" alt="" width="20" height="20" />` : st === "success" ? icon("location-located.svg", 20) : icon("navigation-arrow.svg");
    const txt = st === "locating" ? "Locating…" : st === "success" ? "My location" : "Use my location";
    slot.innerHTML = `<button type="button" class="btn btn--secondary btn--icon-left locbtn locbtn--icon ${cls}" data-action="use-location" aria-label="${txt}" ${st === "locating" ? 'aria-busy="true"' : ""}>${ic}<span class="locbtn__txt">${txt}</span></button>`;
  }

  function renderMobileRow() {
    const el = $("#mobile-row"); if (!el) return;
    const n = filterCount();
    el.innerHTML = `
      <button type="button" class="chip ${n ? "is-selected" : ""}" data-action="open-filter-sheet">${n ? `Filters (${n})` : "Filters"} ${icon(n ? "chevron-blue.svg" : "chevron.svg", 14)}</button>
      <button type="button" class="btn btn--secondary btn--sm btn--icon-right" data-action="toggle-view">${L.view === "map" ? `List view ${listIcon()}` : `Map view ${icon("map-trifold.svg", 20)}`}</button>`;
  }

  function renderNotice() {
    const el = $("#notice"); if (!el) return;
    if (L.loc === "locating") el.innerHTML = `<div class="notice" role="status"><img class="spin" src="assets/icons/spinner.svg" alt="" width="18" height="18" /><span>Finding your location…</span></div>`;
    else if (L.loc === "success") el.innerHTML = `<div class="notice" role="status">${icon("location-located.svg", 18)}<span>Showing stores near your current location</span><button type="button" data-action="loc-change">Change</button></div>`;
    else if (L.loc === "blocked") el.innerHTML = `<div class="notice notice--blocked" role="alert">${icon("warning-circle.svg", 18)}<span>We couldn't get your location. Allow location access in your browser, or enter a suburb or postcode.</span></div>`;
    else el.innerHTML = "";
  }

  function chip(key, label, count) {
    const exp = openDrop === key;
    return `<div class="chip-wrap"><button type="button" class="chip ${count ? "is-selected" : ""}" data-action="drop" data-key="${key}" aria-expanded="${exp}" aria-haspopup="true">${esc(label)}${count ? ` (${count})` : ""} ${icon(count ? "chevron-blue.svg" : "chevron.svg", 14)}</button>${exp ? dropdown(key) : ""}</div>`;
  }
  const optionsFor = (key) => key === "services" ? D.SERVICES.map((s) => [s.id, s.label]) : key === "states" ? D.STATES.map((s) => [s, s]) : D.WEEKENDS.map((s) => [s.id, s.label]);
  function checkOpts(key, sel) {
    return optionsFor(key).map(([id, label]) => `<label class="opt"><input type="checkbox" data-group="${key}" value="${id}" ${sel.includes(id) ? "checked" : ""} /><span class="opt__box">${icon("checkbox-tick.svg", 10, 8)}</span>${esc(label)}</label>`).join("");
  }
  function radioOpts(name, cur) {
    return D.SORTS.map((s) => `<label class="opt"><input type="radio" name="${name}" data-group="sort" value="${s.id}" ${cur === s.id ? "checked" : ""} /><span class="opt__radio"></span>${esc(s.label)}</label>`).join("");
  }
  function dropdown(key) {
    if (key === "sort") return `<div class="dropdown" role="dialog" aria-label="Sort">${radioOpts("sort-dd", L.sort)}</div>`;
    if (key === "all") {
      return `<div class="dropdown" role="dialog" aria-label="Filters" style="width:320px;max-height:60vh;overflow:auto">
        ${["services", "states", "weekends"].map((k) => `<p class="h6 muted" style="padding:8px 12px 4px">${{ services: "Services", states: "State", weekends: "Weekends" }[k]}</p>${checkOpts(k, draft[k])}`).join("")}
        <hr class="divider" /><div class="dropdown__actions"><button type="button" class="btn btn--text" data-action="drop-clear">Clear</button><button type="button" class="btn btn--primary" data-action="drop-apply">Apply</button></div></div>`;
    }
    return `<div class="dropdown" role="dialog" aria-label="${key}">${checkOpts(key, draft[key])}<hr class="divider" /><div class="dropdown__actions"><button type="button" class="btn btn--text" data-action="drop-clear">Clear</button><button type="button" class="btn btn--primary" data-action="drop-apply">Apply</button></div></div>`;
  }

  function renderRH() {
    const el = $("#rh"); if (!el) return;
    const list = resultsList();
    const count = L.status === "ready" && L.region !== "none" ? `<p class="rh__count">${plural(list.length, "store", "stores")} within 50 km</p>` : "";
    const split = L.view === "map" && !isMobile();
    const f = L.filters;
    const sortLabel = D.SORTS.find((s) => s.id === L.sort).label;
    const desktop = split
      ? `<div class="rh rh--desktop"><div class="rh__group">${chip("all", "Filters", filterCount())}<div class="chip-wrap"><button type="button" class="chip is-selected" data-action="drop" data-key="sort" aria-expanded="${openDrop === "sort"}">Sort: ${esc(sortLabel)} ${icon("chevron-blue.svg", 14)}</button>${openDrop === "sort" ? dropdown("sort") : ""}</div></div>${count}</div>`
      : `<div class="rh rh--desktop"><div class="rh__group"><span class="rh__label">Filters</span>${chip("services", "Services", f.services.length)}${chip("states", "State", f.states.length)}${chip("weekends", "Weekends", f.weekends.length)}</div>
         <div class="rh__group" role="radiogroup" aria-label="Sort"><span class="rh__label">Sort</span>${D.SORTS.map((s) => `<button type="button" role="radio" aria-checked="${L.sort === s.id}" class="chip ${L.sort === s.id ? "is-selected" : ""}" data-action="sort" data-sort="${s.id}">${s.label}</button>`).join("")}</div>${count}</div>`;
    const mobile = `<div class="rh rh--mobile"><div class="rh__sort" role="radiogroup" aria-label="Sort">${D.SORTS.map((s) => `<button type="button" role="radio" aria-checked="${L.sort === s.id}" class="chip ${L.sort === s.id ? "is-selected" : ""}" data-action="sort" data-sort="${s.id}">${s.short}</button>`).join("")}</div>${count}</div>`;
    el.innerHTML = desktop + mobile;
  }

  /* ----- Card style options (prototype: compare desktop card designs) ----- */
  const CARD_STYLES = [["current", "Current"], ["c", "C · Photo grid"], ["d", "D · Split card"], ["e", "E · Time slots"]];
  let cardStyle = (() => { try { const v = localStorage.getItem("cc-card"); return CARD_STYLES.some(([k]) => k === v) ? v : "current"; } catch { return "current"; } })();
  const useVariant = () => !isMobile() && cardStyle !== "current";
  const SERVICES_SHOWN = ["Free measure", "Carpet", "Timber", "Blinds"];
  const tick = `<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const statusHTML = (s) => `<span class="status ${/^Closed/.test(s.open) ? "status--closed" : ""}"><span class="status__dot" aria-hidden="true"></span>${esc(s.open)}</span>`;
  const ratingHTML = (s) => `<span class="vrating">${icon("star.svg", 14)}<b>${s.rating}</b><span>(${s.reviews})</span></span>`;
  function cardSwitcher() {
    return `<div class="card-switch" role="group" aria-label="Store card options (prototype)"><span>Card options</span>${CARD_STYLES.map(([k, l]) => `<button type="button" data-action="card-style" data-style="${k}" aria-pressed="${cardStyle === k}">${l}</button>`).join("")}</div>`;
  }
  function cardVariant(s) {
    const sel = s.id === L.selectedId ? "is-selected" : "";
    const book = (cls = "btn--primary") => `<button type="button" class="btn ${cls}" data-action="open-chat" data-context="book-store" data-id="${s.id}">Book this time</button>`;
    const pinIco = `<span class="ico">${icon("store-locator.svg", 18)}</span>`;
    const clockIco = `<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>`;
    const starIco = `<span class="ico">${icon("star.svg", 18)}</span>`;
    const toolIco = `<span class="ico" style="color:var(--success)">${tick}</span>`;
    if (cardStyle === "d") return `<article class="vcard-d ${sel}" data-action="select-store" data-id="${s.id}" aria-label="${esc(s.name)}">
      <div class="vcard-d__media"><img src="${s.img}" alt="${esc(s.short)} showroom" loading="lazy" /></div>
      <div class="vcard-d__body">
        <div class="vcard-d__head"><h2 class="vcard-d__name"><a href="#/store/${s.id}">${esc(s.name)}</a></h2><span class="vcard-d__km">${s.km.toFixed(1)} km</span></div>
        <ul class="vinfo">
          <li>${pinIco}${esc(s.address)}</li>
          <li>${clockIco}${statusHTML(s)}</li>
          <li>${starIco}<span><b style="color:var(--black);font-weight:500">${s.rating}</b> from ${s.reviews} Google reviews</span></li>
          <li>${toolIco}${SERVICES_SHOWN.join(" · ")}</li>
        </ul>
        <div class="vnext"><div class="vnext__txt"><p class="vlabel">Next free measure</p><p class="vtime">${esc(s.earliest)}</p></div>
          <div class="vnext__actions"><a class="vlink" href="#/store/${s.id}">View store page</a>${book("btn--primary btn--sm")}</div></div>
      </div></article>`;
    if (cardStyle === "e") return `<article class="vcard-e ${sel}" data-action="select-store" data-id="${s.id}" aria-label="${esc(s.name)}">
      <img class="vcard-e__img" src="${s.img}" alt="${esc(s.short)} showroom" loading="lazy" />
      <div class="vcard-e__info">
        <h2 class="vcard-e__name"><a href="#/store/${s.id}">${esc(s.name)}</a></h2>
        <p class="vline">${esc(s.address)} · ${s.km.toFixed(1)} km</p>
        <p class="vline">${statusHTML(s)}<span class="vsep" aria-hidden="true">·</span>${ratingHTML(s)}</p>
      </div>
      <div class="vcard-e__slots">
        <p class="vlabel">Book a free measure: pick a time</p>
        <div class="vslots">${s.slots.map(([d, t]) => `<button type="button" class="vslot" data-action="open-chat" data-context="book-store" data-id="${s.id}" data-when="${esc(d + ", " + t)}" aria-label="Book ${esc(d)}, ${t}"><small>${esc(d)}</small><b>${t}</b></button>`).join("")}</div>
        <div class="vcard-e__foot"><a class="vlink" href="#/store/${s.id}">Store details</a><a class="vlink" href="#/store/${s.id}#book">More times</a></div>
      </div></article>`;
    return `<article class="vcard-c ${sel}" data-action="select-store" data-id="${s.id}" aria-label="${esc(s.name)}">
      <img class="vcard-c__img" src="${s.img}" alt="${esc(s.short)} showroom" loading="lazy" />
      <div class="vcard-c__body">
        <div class="vcard-c__head"><h2 class="vcard-c__name"><a href="#/store/${s.id}">${esc(s.name)}</a></h2><span class="vcard-c__km">${s.km.toFixed(1)} km</span></div>
        <p class="vline">${esc(s.address)}</p>
        <p class="vline">${statusHTML(s)}<span class="vsep" aria-hidden="true">·</span>${ratingHTML(s)}</p>
      </div>
      <div class="vcard-c__foot"><p class="vcard-c__next"><span class="vlabel">Next free measure</span><span class="vtime">${esc(s.earliest)}</span></p>
        <div class="vcard-c__btns"><a class="btn btn--secondary btn--sm" href="#/store/${s.id}">View store page</a>${book("btn--primary btn--sm")}</div></div></article>`;
  }

  function cardHTML(s, i) {
    if (useVariant()) return cardVariant(s, i);
    const sel = s.id === L.selectedId;
    const featured = sel || (!L.selectedId && i === 0);
    return `<article class="scard ${sel ? "is-selected" : ""} ${featured ? "is-featured" : ""}" data-action="select-store" data-id="${s.id}" aria-label="${esc(s.name)}">
      <img class="scard__img" src="${s.img}" alt="${esc(s.short)} showroom" loading="lazy" />
      <div class="scard__details">
        <div class="scard__name-row"><h2 class="scard__name">${esc(s.name)}</h2><span class="scard__km">${s.km.toFixed(1)} km</span></div>
        <div class="meta-row"><span class="scard__addr">${esc(s.address)}</span>
          <span class="meta-item"><span aria-hidden="true">·</span><span class="rating"><span class="stars" aria-hidden="true">${icon("star.svg", 12).repeat(5)}</span><span class="rating__score">${s.rating}</span><span class="rating__count">(${s.reviews})</span></span></span>
          <span class="meta-item"><span aria-hidden="true">·</span>${esc(s.open)}</span></div>
        <div class="scard__tags"><span class="tag">Free measure</span><span class="tag">Carpet</span><span class="tag">Timber</span><span class="tag">Blinds</span></div>
      </div>
      <div class="scard__booking">
        <p class="scard__next-label">Earliest measure</p>
        <p class="scard__next">${esc(s.earliest)}</p>
        <button type="button" class="btn btn--primary btn--block" data-action="open-chat" data-context="book-store" data-id="${s.id}">Book this time</button>
        <a class="btn btn--secondary btn--block" href="#/store/${s.id}">View store page</a>
      </div>
    </article>`;
  }

  function renderResults() {
    const el = $("#results"); if (!el) return;
    el.setAttribute("aria-busy", L.status === "loading");
    if (L.status === "loading") {
      el.innerHTML = `<div class="results">${Array.from({ length: 3 }, () => `<div class="scard scard--skel" aria-hidden="true"><div class="skel" style="width:96px;height:96px"></div><div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="skel" style="width:220px;height:16px"></div><div class="skel" style="width:300px;max-width:100%;height:10px;border-radius:5px"></div><div style="display:flex;gap:8px"><div class="skel" style="width:64px;height:18px;border-radius:9px"></div><div class="skel" style="width:64px;height:18px;border-radius:9px"></div><div class="skel" style="width:64px;height:18px;border-radius:9px"></div></div></div><div style="width:200px;max-width:100%;display:flex;flex-direction:column;gap:8px;align-items:flex-end"><div class="skel" style="width:120px;height:10px;border-radius:5px"></div><div class="skel" style="width:100%;height:36px;border-radius:18px"></div></div></div>`).join("")}<span class="sr-only">Searching for stores…</span></div>`;
      return;
    }
    if (L.status === "error") {
      el.innerHTML = `<div class="results"><div class="msg" role="alert"><div class="msg__icon">${icon("warning-circle.svg", 28)}</div><p class="msg__title">We couldn't load stores</p><p class="msg__text">Check your connection and try again. Your search and filters are kept.</p><div class="msg__actions"><button type="button" class="btn btn--primary" data-action="retry">Try again</button></div></div></div>`;
      return;
    }
    const list = resultsList();
    if (!list.length) {
      const where = L.searchedLabel || "your area";
      const byFilter = L.region !== "none";
      el.innerHTML = `<div class="results"><div class="msg" role="status"><div class="msg__icon">${icon("magnifying-28.svg", 28)}</div>
        <p class="msg__title">${byFilter ? "No stores match those filters" : `No stores within 50 km of ${esc(where)}`}</p>
        <p class="msg__text">${byFilter ? `Try removing a filter or searching a nearby suburb. The nearest store to ${esc(where)} is Raymond Terrace (21.4 km).` : "Try a nearby suburb or postcode. Stores in this prototype are around Port Stephens and Newcastle (for example 2315)."}</p>
        <div class="msg__actions">${byFilter ? `<button type="button" class="btn btn--secondary" data-action="clear-filters">Clear filters</button>` : ""}<button type="button" class="btn btn--text" style="color:var(--black)" data-action="search-another">Search another suburb</button></div></div></div>`;
      return;
    }
    if (!list.some((s) => s.id === L.selectedId)) L.selectedId = list[0].id;
    const limit = isMobile() && !L.showAll ? 4 : list.length;
    el.innerHTML = `${isMobile() ? "" : cardSwitcher()}<div class="results ${useVariant() ? `results--${cardStyle}` : ""}">${list.slice(0, limit).map(cardHTML).join("")}</div>${limit < list.length ? `<button type="button" class="link-btn show-more" data-action="show-more">Show more (${list.length - limit})</button>` : ""}`;
  }

  /* ----- Map ----- */
  const mapState = { x: 0, y: 0, z: 1, moved: false, areaLoading: false };
  function renderMap() {
    const target = L.view === "map" ? (isMobile() ? $("#map-mobile") : $("#map-desktop")) : null;
    const other = isMobile() ? $("#map-desktop") : $("#map-mobile");
    if (other) other.innerHTML = "";
    if (!target) { const mm = $("#map-mobile"); if (mm) mm.innerHTML = ""; return; }
    const list = L.status === "ready" ? resultsList() : [];
    const sel = list.find((s) => s.id === L.selectedId);
    target.innerHTML = `<div class="mapbox ${isMobile() ? "mapbox--mobile" : ""}" id="mapbox" aria-label="Map of stores">
      <div class="mapbox__layer" id="maplayer" style="transform:translate(${mapState.x}px,${mapState.y}px) scale(${mapState.z})">
        <img class="mapbox__img" src="assets/img/map-locator.png" alt="" draggable="false" />
        ${list.map((s) => pinHTML(s, s.id === L.selectedId)).join("")}
      </div>
      <div class="mapbox__zoom"><button type="button" data-action="zoom" data-z="1" aria-label="Zoom in">+</button><button type="button" data-action="zoom" data-z="-1" aria-label="Zoom out">-</button></div>
      ${mapState.moved || mapState.areaLoading ? `<button type="button" class="mapbox__area" data-action="search-area" ${mapState.areaLoading ? "aria-busy=true" : ""}>${mapState.areaLoading ? `<img class="spin" src="assets/icons/circle-notch.svg" alt="" width="18" height="18" />Searching...` : `${icon("arrow-clockwise.svg", 18)}Search this area`}</button>` : ""}
      ${sel ? ssbarHTML(sel) : ""}
    </div>`;
    fitMap();
  }
  // Desktop split view: the map fills the visible screen below the header, then sticks while the list scrolls.
  function fitMap() {
    const wrap = $("#map-desktop"), box = $("#mapbox", wrap || undefined);
    if (!wrap || !box) return;
    const top = wrap.getBoundingClientRect().top;
    box.style.height = Math.max(420, innerHeight - Math.max(0, top)) + "px";
  }
  window.addEventListener("scroll", () => { if (L.view === "map" && !isMobile()) fitMap(); }, { passive: true });
  window.addEventListener("resize", () => { if (L.view === "map" && !isMobile()) fitMap(); });
  function pinHTML(s, sel) {
    // The layer is 140% of the visible map (inset -20%), so map design % to layer %.
    const pos = `left:${((20 + s.pin.x) / 1.4).toFixed(2)}%;top:${((20 + s.pin.y) / 1.4).toFixed(2)}%`;
    if (!sel) return `<button type="button" class="pin" style="${pos}" data-action="select-pin" data-id="${s.id}" aria-label="${esc(s.name)}"><span class="pin__badge">${icon("map-pin-blue.svg", 20)}</span></button>`;
    return `<button type="button" class="pin is-selected" style="${pos}" data-action="select-pin" data-id="${s.id}" aria-label="${esc(s.name)}, selected" aria-pressed="true"><span class="pin__halo"><span class="pin__badge">${icon("d-map-pin.svg", 26)}</span></span><span class="pin__label">${esc(s.short)}</span></button>`;
  }
  function ssbarHTML(s) {
    return `<div class="ssbar" role="region" aria-label="Selected store">
      <div class="ssbar__store"><span class="ssbar__badge">${icon("d-map-pin.svg", 20)}</span><div class="ssbar__text"><p class="ssbar__name">${esc(s.name)}</p><p class="ssbar__meta">${s.km.toFixed(1)} km · ${esc(s.shortAddress)}</p></div></div>
      <div class="ssbar__actions"><a class="btn btn--secondary" href="#/store/${s.id}">View store page</a><button type="button" class="btn btn--primary" data-action="open-chat" data-context="book-store" data-id="${s.id}">Book now</button></div>
      <button type="button" class="ssbar__close" data-action="close-ssbar" aria-label="Close selected store">${icon("close.svg", 24)}</button></div>`;
  }
  // Drag to pan
  let drag = null;
  app.addEventListener("pointerdown", (e) => {
    const layer = e.target.closest("#maplayer"); if (!layer || e.target.closest(".pin")) return;
    drag = { sx: e.clientX, sy: e.clientY, x: mapState.x, y: mapState.y, moved: false };
    layer.setPointerCapture(e.pointerId); $("#mapbox").classList.add("is-dragging");
  });
  app.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
    const lim = 140;
    mapState.x = Math.max(-lim, Math.min(lim, drag.x + dx)); mapState.y = Math.max(-lim, Math.min(lim, drag.y + dy));
    const layer = $("#maplayer"); if (layer) layer.style.transform = `translate(${mapState.x}px,${mapState.y}px) scale(${mapState.z})`;
  });
  const endDrag = () => { if (!drag) return; const moved = drag.moved; drag = null; $("#mapbox")?.classList.remove("is-dragging"); if (moved && !mapState.moved) { mapState.moved = true; renderMap(); } };
  app.addEventListener("pointerup", endDrag); app.addEventListener("pointercancel", endDrag);

  /* ----- Suggestions ----- */
  function suggestions(q) {
    const t = q.trim().toLowerCase();
    if (t.length < 3 && !/^\d{2,}$/.test(t)) return { mode: "recent" };
    const items = D.SUBURBS.filter((s) => s.name.toLowerCase().includes(t) || s.postcode.startsWith(t)).slice(0, 6);
    return items.length ? { mode: "list", items } : { mode: "empty" };
  }
  function bold(name, q) {
    const i = name.toLowerCase().indexOf(q.trim().toLowerCase());
    if (i < 0 || !q.trim()) return esc(name);
    return esc(name.slice(0, i)) + "<b>" + esc(name.slice(i, i + q.trim().length)) + "</b>" + esc(name.slice(i + q.trim().length));
  }
  function renderSuggest(open = true) {
    const box = $("#suggest"), input = $("#loc-q"); if (!box || !input) return;
    if (!open) { box.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); suggestIdx = -1; return; }
    const q = input.value; const s = suggestions(q);
    let html = `<button type="button" class="suggest__loc" data-action="use-location" role="option" id="sg-loc">${icon("navigation-arrow.svg")}Use my current location</button>`;
    if (s.mode === "recent") {
      html += recent.length ? `<p class="suggest__label">Recent searches</p>` + recent.map((r, i) => `<button type="button" class="suggest__item ${suggestIdx === i ? "is-active" : ""}" role="option" id="sg-${i}" data-action="pick" data-value="${esc(r.label)}"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#382E2C" stroke-width="1.8"/><path d="M12 7v5l3 2" fill="none" stroke="#382E2C" stroke-width="1.8" stroke-linecap="round"/></svg><span>${esc(r.label)} <small>${esc(r.rest)}</small></span></button>`).join("") : "";
    } else if (s.mode === "list") {
      html += `<p class="suggest__label">Suburbs</p>` + s.items.map((it, i) => `<button type="button" class="suggest__item ${suggestIdx === i ? "is-active" : ""}" role="option" id="sg-${i}" aria-selected="${suggestIdx === i}" data-action="pick" data-value="${esc(it.name)}">${icon("map-pin-blue.svg", 18)}<span>${bold(it.name, q)} <small>${esc(it.rest)}</small></span></button>`).join("");
    } else {
      html = `<div class="suggest__empty" role="status">${icon("magnifying-glass.svg", 18)}<span>No suburbs match "${esc(q.trim())}". Check the spelling, or search by postcode.</span></div>`;
    }
    box.innerHTML = html; box.hidden = false; input.setAttribute("aria-expanded", "true");
    if (suggestIdx >= 0) input.setAttribute("aria-activedescendant", `sg-${suggestIdx}`); else input.removeAttribute("aria-activedescendant");
  }
  const suggestItems = () => $$("#suggest .suggest__item");

  /* ----- Search ----- */
  function resolveQuery(q) {
    const t = q.trim(); const lower = t.toLowerCase();
    const sub = D.SUBURBS.find((s) => s.name.toLowerCase() === lower) || D.SUBURBS.find((s) => s.postcode === t);
    const pc = sub ? sub.postcode : /^\d{4}$/.test(t) ? t : null;
    const inArea = pc ? /^2(2[89]|3[0-2])\d$/.test(pc) : false;
    return { label: sub ? sub.name : t, rest: sub ? sub.rest : pc ? "" : "", region: inArea ? "all" : "none" };
  }
  function runSearch(q, opts = {}) {
    const r = resolveQuery(q);
    L.query = q.trim(); L.searchedLabel = r.label; L.region = r.region; L.showAll = false;
    if (!opts.fromLocation) L.loc = "idle";
    if (L.query && !opts.fromLocation && (r.region === "all" || D.SUBURBS.some((s) => s.name === r.label))) {
      recent = [{ label: r.label, rest: r.rest || "" }, ...recent.filter((x) => x.label.toLowerCase() !== r.label.toLowerCase())].slice(0, 3);
      try { localStorage.setItem("cc-recent", JSON.stringify(recent)); } catch {}
    }
    fetchStores();
  }
  let fetchTimer;
  function fetchStores(delay = 900) {
    clearTimeout(fetchTimer);
    L.status = "loading"; mapState.moved = false; updateLocator();
    fetchTimer = setTimeout(() => {
      L.status = failNext ? "error" : "ready"; failNext = false;
      const list = resultsList(); L.selectedId = list[0]?.id || null;
      updateLocator();
    }, delay);
  }

  /* ----- Use my location ----- */
  function useLocation(force) {
    renderSuggest(false);
    L.loc = "locating"; updateLocator();
    const done = (ok) => {
      L.loc = ok ? "success" : "blocked";
      if (ok) { L.query = ""; const i = $("#loc-q"); if (i) i.value = ""; $(".searchbox__clear")?.setAttribute("hidden", ""); L.region = "all"; L.searchedLabel = "your location"; fetchStores(600); }
      else updateLocator();
    };
    if (force) return setTimeout(() => done(force === "success"), 900);
    if (!navigator.geolocation) return setTimeout(() => done(false), 600);
    navigator.geolocation.getCurrentPosition(() => done(true), () => done(false), { timeout: 8000, maximumAge: 600000 });
  }

  /* ----- Filters (draft until Apply) ----- */
  const cloneF = () => JSON.parse(JSON.stringify(L.filters));
  function openDropdown(key) {
    openDrop = openDrop === key ? null : key; draft = cloneF(); renderRH();
    if (openDrop) $(`.chip[data-key="${key}"]`)?.parentElement.querySelector(".dropdown input")?.focus();
  }
  function closeDropdown() { if (!openDrop) return; const k = openDrop; openDrop = null; draft = null; renderRH(); $(`.chip[data-key="${k}"]`)?.focus(); }
  function applyFilters(next) { L.filters = next; openDrop = null; draft = null; fetchStores(500); }

  function openFilterSheet() {
    draft = cloneF(); let draftSort = L.sort;
    const counts = () => { const save = L.filters, ss = L.sort; L.filters = draft; L.sort = draftSort; const n = resultsList().length; L.filters = save; L.sort = ss; return n; };
    const groups = () => `<div class="sheet__group"><p class="h4">Sort by</p>${radioOpts("sort-sheet", draftSort)}</div>
      ${["services", "states", "weekends"].map((k) => `<div class="sheet__group"><p class="h4">${{ services: "Services", states: "State", weekends: "Weekends" }[k]}</p>${checkOpts(k, draft[k])}</div>`).join("")}`;
    const footLabel = () => { const n = counts(); return `Show ${plural(n, "store", "stores")}`; };
    openSheet(`<div class="sheet__handle"><span></span></div>
      <div class="sheet__head"><h2 class="h3" id="sheet-title">Filters</h2><button type="button" class="popover__close" data-action="close-overlay" aria-label="Close filters">${icon("close.svg", 24)}</button></div>
      <div class="sheet__body" id="sheet-body">${groups()}</div>
      <div class="sheet__foot"><button type="button" class="btn btn--secondary" data-action="sheet-clear">Clear all</button><button type="button" class="btn btn--primary" data-action="sheet-apply" id="sheet-apply">${footLabel()}</button></div>`, "sheet-title");
    sheetHooks = {
      change(input) { if (input.dataset.group === "sort") draftSort = input.value; else toggleIn(draft[input.dataset.group], input.value, input.checked); $("#sheet-apply").textContent = footLabel(); },
      clear() { draft = { services: [], states: [], weekends: [] }; $("#sheet-body").innerHTML = groups(); $("#sheet-apply").textContent = footLabel(); },
      apply() { L.sort = draftSort; closeOverlays(); applyFilters(draft); },
    };
  }
  const toggleIn = (arr, v, on) => { const i = arr.indexOf(v); if (on && i < 0) arr.push(v); if (!on && i >= 0) arr.splice(i, 1); };

  /* ================= Store Details ================= */
  function detailStore(id) {
    const s = storeById(id);
    if (s) return { ...s, fullAddress: `${s.address.split(",")[0]}, ${s.suburb}`, short: s.short };
    return { ...D.DETAIL_ONLY, fullAddress: D.DETAIL_ONLY.address, rating: 4.8, reviews: 84 };
  }
  const TABS = [["team", "Team"], ["promotions", "Promotions"], ["services", "Services"], ["why-us", "Why us"], ["reviews", "Reviews"], ["areas", "Areas"], ["socials", "Socials"], ["faqs", "FAQs"], ["visit", "Visit"]];

  function hoursHTML(withHeader) {
    const today = 3; // Thursday, as in the design
    return `<div class="hours">${withHeader ? `<div class="popover__head"><p class="h4" id="hours-title">Opening hours</p><button type="button" class="popover__close" data-action="close-overlay" aria-label="Close opening hours">${icon("close.svg", 20)}</button></div>` : ""}
      <p class="hours__status"><span class="hours__dot"></span>Open now · closes 5:00pm</p>
      <div class="hours__days">${D.HOURS.map(([d, h], i) => `<div class="hours__row ${i === today ? "is-today" : ""}"><span>${d}</span><span class="${h === "Closed" ? "closed" : ""}">${h}</span></div>`).join("")}</div>
      <p class="hours__note">Public holiday hours may vary.</p></div>`;
  }
  const sh = (over, title, sub) => `<div class="sh"><p class="overline">${over}</p><h2 class="h2">${title}</h2>${sub ? `<p class="sh__sub">${sub}</p>` : ""}</div>`;
  const featureVideo = (id, caption, w) => `<div class="vfeature" ${w ? `style="width:${w}px"` : ""}>
      <div class="vfeature__player" id="vp-${id}" data-video="${id}">
        <img src="assets/img/d-thumbnail.png" alt="" />
        <button type="button" class="vfeature__play" data-action="video-play" data-video="${id}" aria-label="Play video: ${esc(caption)}"><span class="playbtn playbtn--lg">${icon("d-play-circle1.svg", 28)}</span></button>
        <button type="button" class="fsbtn" data-action="video-full" data-video="${id}" data-caption="${esc(caption)}" aria-label="View full screen">${icon("d-corners-out.svg", 20)}</button>
      </div><p class="p-xs muted">${esc(caption)}</p></div>`;

  function mapCardHTML(st, extra = "") {
    return `<section class="card mapcard ${extra}" aria-labelledby="map-title-${extra || "d"}">${sh("MAP", `<span id="map-title-${extra || "d"}">Find us</span>`)}
      <div class="mapcard__map"><img src="assets/img/d-map.png" alt="Map showing ${esc(st.name)}" /><span class="pin is-selected" style="position:relative;left:auto;top:auto"><span class="pin__halo"><span class="pin__badge">${icon("d-map-pin.svg", 26)}</span></span><span class="pin__label">${esc(st.short)}</span></span></div>
      <p class="p-xs muted">${esc(st.fullAddress)}</p>
      <a class="btn btn--secondary btn--block" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(st.name + " " + st.fullAddress)}" target="_blank" rel="noopener">Get directions</a></section>`;
  }

  function renderDetails(id) {
    const st = detailStore(id);
    document.title = `${st.name} | Carpet Court`;
    DS.time = DS.time && DS.storeId === id ? DS.time : null; DS.storeId = id;
    const dir = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(st.name + " " + st.fullAddress)}`;
    app.innerHTML = `
      <section class="hero">
        <img class="hero__bg" src="assets/img/d-hero-sections.png" alt="" />
        <div class="hero__inner wrap">
          <p class="hero__crumbs"><a href="#/">Home</a> / <a href="#/">Store locator</a></p>
          <div class="hero__main">
            <div>
              <p class="hero__badge">Locally owned since 2001</p>
              <h1 class="hero__name">${esc(st.name)}</h1>
              <p class="hero__desc">Carpet Court is a trusted carpet and flooring store in ${esc(st.short)} for flooring solutions and window furnishings. We offer a wide range of carpets, rugs, timber, vinyl and laminate flooring, curtains and blinds to create your dream space.</p>
              <p class="hero__addr">${icon("d-store-locator1.svg")}${esc(st.fullAddress)}</p>
              <div class="hero__hours hours-anchor">
                <span class="hero__rating">★★★★★ ${st.rating} <span>(${st.reviews})</span></span>
                <span class="hero__today"><span>Today</span><span>9:00 am – 5:00 pm</span></span>
                <button type="button" class="link-btn" data-action="hours" aria-haspopup="dialog">View full hours</button>
              </div>
            </div>
            <div class="hero__ctas" id="hero-ctas">
              <button type="button" class="btn btn--primary" data-action="open-chat" data-context="consultation">Book a free consultation</button>
              <a class="btn btn--secondary" href="#visit" data-action="scroll-to" data-target="visit">Full store details</a>
              <a class="btn btn--secondary" href="${dir}" target="_blank" rel="noopener">Get directions</a>
            </div>
          </div>
          <img class="hero__img" src="assets/img/d-service-area-coverage-map-schematic.png" alt="${esc(st.short)} showroom" />
        </div>
      </section>
      <nav class="subnav" id="subnav" aria-label="On this page"><div class="subnav__inner wrap">
        <span class="subnav__brand">${esc(st.name)}</span>
        <div class="subnav__tabs" id="tabs"><a class="tab tab--mobile-only" href="#book" data-action="scroll-to" data-target="book">Book</a>${TABS.map(([k, l]) => `<a class="tab" href="#${k}" data-action="scroll-to" data-target="${k}">${l}</a>`).join("")}</div>
        <button type="button" class="btn btn--primary subnav__cta" data-action="open-chat" data-context="consultation">Book a free consultation</button>
      </div></nav>
      <div class="details wrap">
        <div class="details__main">
          <section class="card section" id="team">${sh("MEET THE TEAM", "Get to know the showroom", "Todd, Maayan, Kianne and Shaun — the people who'll measure, quote and lay your floor.")}
            <div class="team">${[["d-photo.png", "Todd", "Store owner"], ["d-photo1.png", "Maayan", "Flooring consultant"], ["d-photo2.png", "Kianne", "Interior designer"], ["d-photo3.png", "Shaun", "Installer"]].map(([img, n, r]) => `<div class="member"><img src="assets/img/${img}" alt="${n}" loading="lazy" /><p class="h5">${n}</p><p class="p-xs muted">${r}</p></div>`).join("")}</div>
            <button type="button" class="vcard-compact" data-action="video-full" data-video="tour" data-caption="Take a look inside - ${esc(st.name)}"><span class="vthumb"><img src="assets/img/d-thumbnail.png" alt="" /><span class="playbtn">${icon("d-play-circle.svg", 20)}</span></span><span class="item-text" style="gap:4px"><span class="h5">Take a look inside</span><span class="p-xs muted">A 90-second walkthrough of the showroom before you visit.</span></span></button>
          </section>
          <section class="card section" id="awards">${sh("AWARDS", "What we're recognised for")}
            <div class="awards">${[["Winner", "Best Performing New Member 2026"], ["Finalist", "State Member of the Year NSW/ACT 2026"], ["Finalist", "Window Furnishings Growth & Excellence 2026"]].map(([s, a]) => `<div class="award">${icon("d-trophy.svg", 32)}<div class="item-text"><p class="h6">${s}</p><p class="p-xs muted">${esc(a)}</p></div></div>`).join("")}</div>
          </section>
          <section class="card section" id="promotions">${sh("PROMOTIONS", `What's on at ${esc(st.short)}`)}
            <div class="promos">${[["d-image.png", "Network offer · ends 30 Sept", "Up to 30% off selected carpet"], ["d-image1.png", "Available in store", "Interest-free payment plans"], ["d-image2.png", `${esc(st.short)} only`, "Free underlay with blinds bundle"]].map(([img, l, t]) => `<a class="promo-card" href="#"><img src="assets/img/${img}" alt="" loading="lazy" /><p class="p-xs">${l}</p><p class="h4">${t}</p></a>`).join("")}</div>
          </section>
          <section class="card section" id="services">${sh("SERVICES AVAILABLE", "What we do here")}
            <div class="services">${[["Free in-home measure", "Across Port Stephens"], ["Installation", "Our own fitting team"], ["Blinds & curtains", "Made to measure"], ["Samples to take home", "No appointment needed"], ["Trade & rental pricing", "Landlords and builders"]].map(([t, c]) => `<div class="service">${icon("d-check-circle.svg")}<div class="item-text"><p class="h6">${esc(t)}</p><p class="p-xs muted">${esc(c)}</p></div></div>`).join("")}</div>
          </section>
          <section class="card section" id="reviews"><div class="reviews">
            <div class="rsum"><p class="overline">REVIEWS</p><h2 class="h2">${st.rating} from ${st.reviews} Google reviews</h2><span class="stars stars--gap2" aria-label="${st.rating} out of 5 stars">${icon("d-star1.svg", 18).repeat(5)}</span><p class="p-xs muted">Pulled live from the store's Google Business Profile.</p><a class="btn btn--secondary btn--icon-right" href="https://www.google.com/search?q=${encodeURIComponent(st.name + " reviews")}" target="_blank" rel="noopener">Read them on Google ${icon("d-arrow-square-out.svg")}</a></div>
            ${[["“Todd came on time, had all carpet books in the van, quote arrived same afternoon.”", "David H. · Google"], ["“Maayan was incredibly helpful in selecting water-resistant laminate for our holiday rental.”", "Jennifer B. · Google"]].map(([q, a]) => `<figure class="review" style="margin:0"><span class="stars stars--gap2" aria-label="5 out of 5 stars">${icon("d-star.svg", 14).repeat(5)}</span><blockquote class="review__quote" style="margin:0">${q}</blockquote><figcaption class="p-xs muted">${a}</figcaption></figure>`).join("")}
          </div></section>
          <section class="card section" id="why-us">${sh("WHY US", "Here is why we're the best at what we do")}
            <div class="whyus"><div class="whyus__text p-sm"><p>At Carpet Court, we're proud to offer the best in flooring and window furnishings. With years of experience, we provide expert advice and personalised service to help you find the perfect carpets, rugs, timber, vinyl and laminate flooring that match your style and budget.</p><p>Our wide range of curtains and blinds pairs beautifully with the flooring options, helping you create a cohesive and welcoming space. We're committed to quality and customer satisfaction, using only top-grade materials and trusted brands to ensure durability and elegance.</p></div>
            ${featureVideo("whyus", "2 minutes with Todd")}</div>
          </section>
          <section class="card section" id="areas">${sh("SERVICE AREAS", "Where we come to you", "Free measure and quote across Port Stephens and surrounds.")}
            <div class="areas"><img class="areas__map" src="assets/img/d-image-service-area-map.png" alt="Service area map" loading="lazy" /><div class="areas__tags">${["Nelson Bay", "Salamander Bay", "Soldiers Point", "Anna Bay", "Corlette", "Fingal Bay", "Shoal Bay", "Medowie", "Lemon Tree Passage", "Tanilba Bay", "Taylors Beach", "Karuah"].map((t) => `<a class="tag" href="#">${t}</a>`).join("")}</div></div>
          </section>
          <section class="card section" id="socials"><div class="social-head">${sh("SOCIALS", "Word is getting around Port Stephens")}<a class="btn btn--secondary" href="https://www.instagram.com/" target="_blank" rel="noopener">View on Instagram</a></div>
            <div class="social-grid">${["d-social-tile.png", "d-social-tile1.png", "d-social-tile2.png", "d-social-tile3.png", "d-social-tile4.png", "d-social-tile5.png", "d-social-tile6.png", "d-service-area-coverage-map-schematic.png"].map((f) => `<a href="#" aria-label="Instagram post"><img src="assets/img/${f}" alt="" loading="lazy" /></a>`).join("")}</div>
          </section>
          <section class="card section" id="faqs">${sh("FAQS", "Questions we get asked here")}
            <div class="faqs"><div class="faqs__list">${D.FAQS.map((f, i) => `<div class="faq" id="faq-${i}"><button type="button" class="faq__q" data-action="faq" aria-expanded="false" aria-controls="faq-a-${i}"><span>${esc(f.q)}</span><i class="faq__icon" aria-hidden="true"></i></button><p class="faq__a" id="faq-a-${i}" hidden>${esc(f.a)}</p></div>`).join("")}</div>
            ${featureVideo("faq", "1-minute video", 340)}</div>
          </section>
          <section class="card section" id="visit">${sh("VISIT US", "Pop in - the kettle's on")}
            <div class="visit"><img class="visit__img" src="assets/img/d-image-storefront.png" alt="${esc(st.name)} storefront" loading="lazy" />
              <div class="visit__info"><p class="p-sm">${esc(st.fullAddress)}</p>${hoursHTML(false)}
                <div class="visit__actions"><a class="btn btn--primary" href="${dir}" target="_blank" rel="noopener">Get directions</a><a class="btn btn--secondary" href="tel:${st.phone.replace(/\s/g, "")}">Call ${esc(st.phone)}</a></div></div></div>
          </section>
          ${mapCardHTML(st, "mapcard--mobile")}
        </div>
        <aside class="details__side">
          <section class="card bpanel" id="book" aria-labelledby="book-title"></section>
          ${mapCardHTML(st)}
        </aside>
      </div>
      <div class="mcta" id="mcta" aria-hidden="true">
        <div class="mcta__text"><p class="p-xs muted">${esc(st.short)}</p><p class="h6" style="line-height:16px">Free Measure &amp; Quote</p></div>
        <a class="mcta__call" href="tel:${st.phone.replace(/\s/g, "")}" aria-label="Call ${esc(st.phone)}" tabindex="-1">${icon("phone-call.svg", 20)}</a>
        <button type="button" class="btn btn--primary btn--sm" data-action="scroll-to" data-target="book" tabindex="-1">Book measure</button>
      </div>`;
    renderBooking();
    setupScrollSpy();
  }

  /* ----- Booking panel ----- */
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const isAvail = (y, m, d) => { const wd = new Date(y, m, d).getDay(); if (wd === 0) return false; if (m === 8) return d >= 8 && d !== 15; return true; };
  const slotsFor = (d) => ["9:00am", "10:30am", "1:00pm", "2:30pm"].map((t, i) => ({ t, off: (d % 3 === 0 && i === 2) || (d % 4 === 1 && i === 0) }));
  function renderBooking() {
    const el = $("#book"); if (!el) return;
    const { year: y, month: m } = DS;
    const first = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(`<span class="day" aria-hidden="true"></span>`);
    for (let d = 1; d <= days; d++) {
      const av = isAvail(y, m, d); const sel = DS.day === d;
      const label = `${WD[new Date(y, m, d).getDay()]} ${d} ${MONTHS[m]}`;
      cells.push(av ? `<button type="button" class="day day--avail ${sel ? "is-selected" : ""}" data-action="pick-day" data-day="${d}" aria-pressed="${sel}" aria-label="${label}${sel ? ", selected" : ""}">${d}</button>` : `<span class="day" aria-label="${label}, unavailable">${d}</span>`);
    }
    const slots = DS.day ? slotsFor(DS.day) : [];
    const left = slots.filter((s) => !s.off).length;
    const dLabel = DS.day ? `${WD[new Date(y, m, DS.day).getDay()]} ${DS.day} ${m === 8 ? "Sept" : MONTHS[m].slice(0, 3)}` : "";
    el.innerHTML = `
      <div class="sh"><p class="overline">BOOK ONLINE</p><h2 class="h2" id="book-title">Pick a time that suits</h2><p class="sh__sub">Live availability from Todd's diary</p></div>
      <div class="bcard">
        <div class="cal">
          <div class="cal__head"><div class="cal__month"><p class="h5" aria-live="polite">${MONTHS[m]} ${y}</p>
            <button type="button" class="cal__nav cal__nav--prev" data-action="month" data-dir="-1" aria-label="Previous month" ${m <= 8 ? "disabled" : ""}>${icon(m <= 8 ? "d-prev-month-disabled-current-month.svg" : "d-next-month.svg", 20)}</button>
            <button type="button" class="cal__nav" data-action="month" data-dir="1" aria-label="Next month" ${m >= 9 ? "disabled" : ""}><img src="assets/icons/${m >= 9 ? "d-prev-month-disabled-current-month.svg" : "d-next-month.svg"}" alt="" width="20" height="20" style="${m >= 9 ? "transform:rotate(180deg)" : ""}" /></button></div>
          </div>
          <div class="cal__grid" role="group" aria-label="${MONTHS[m]} ${y}">${["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((w) => `<span class="cal__wd" aria-hidden="true">${w}</span>`).join("")}${cells.join("")}</div>
        </div>
        ${DS.day ? `<div style="display:flex;flex-direction:column;gap:8px"><p class="times-label"><span class="h6">${dLabel}</span><span class="left">· ${plural(left, "time", "times")} left</span></p>
          <div class="times" role="group" aria-label="Times on ${dLabel}">${slots.map((s) => `<button type="button" class="slot ${DS.time === s.t ? "is-selected" : ""}" data-action="pick-time" data-time="${s.t}" ${s.off ? "disabled aria-label=\"" + s.t + ", taken\"" : `aria-pressed="${DS.time === s.t}"`}>${s.t}${DS.time === s.t ? icon("check-white.svg", 16) : ""}</button>`).join("")}</div></div>` : `<p class="p-xs muted">Pick a day to see times.</p>`}
        <div class="baction">
          <button type="button" class="btn btn--primary btn--block" data-action="book-continue" ${DS.time ? "" : 'disabled aria-disabled="true"'}>Continue</button>
          <p class="note">${DS.time ? "Two fields after this. No account needed." : "Pick a time to continue. Two fields after that, no account needed."}</p>
        </div>
      </div>
      <hr class="divider" />
      <p class="note">Rather we called you? Todd will ring back the same day.</p>
      <button type="button" class="btn btn--secondary btn--block" data-action="open-chat" data-context="callback">Request a callback</button>`;
  }

  /* ----- Scroll spy, sticky states ----- */
  let heroObs, subObs;
  function setupScrollSpy() {
    [heroObs, subObs].forEach((o) => o && o.disconnect());
    const tabs = $$("#tabs .tab");
    const setActive = (id) => tabs.forEach((t) => { const on = t.dataset.target === id; t.classList.toggle("is-active", on); if (on) { t.setAttribute("aria-current", "true"); const bar = $("#tabs"); if (bar) bar.scrollTo({ left: t.offsetLeft - 16, behavior: "smooth" }); } else t.removeAttribute("aria-current"); });
    const ids = [...(isMobile() ? ["book"] : []), ...TABS.map((t) => t[0])];
    let current = null, raf = 0;
    const spy = () => {
      raf = 0;
      let id = ids[0];
      for (const k of ids) { const el = document.getElementById(k); if (el && el.getBoundingClientRect().top <= 140) id = k; }
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) id = "visit";
      if (id !== current) { current = id; setActive(id); }
      // Sticky right column: stick at the top, or at the bottom when it's taller than the screen.
      const side = $(".details__side");
      if (side && !isMobile()) side.style.top = Math.min(56, innerHeight - side.offsetHeight - 16) + "px";
    };
    window.removeEventListener("scroll", window.__ccSpy || (() => {}));
    window.removeEventListener("resize", window.__ccSpy || (() => {}));
    window.__ccSpy = () => { if (!raf) raf = requestAnimationFrame(spy); };
    window.addEventListener("scroll", window.__ccSpy, { passive: true });
    window.addEventListener("resize", window.__ccSpy);
    spy();
    const ctas = $("#hero-ctas"), mcta = $("#mcta");
    if (ctas && mcta) {
      heroObs = new IntersectionObserver(([e]) => { const on = !e.isIntersecting && e.boundingClientRect.top < 0; mcta.classList.toggle("is-on", on); mcta.setAttribute("aria-hidden", String(!on)); $$("a,button", mcta).forEach((b) => (b.tabIndex = on ? 0 : -1)); document.body.classList.toggle("has-mcta", on); });
      heroObs.observe(ctas);
    }
    const sub = $("#subnav");
    if (sub) { const sentinel = document.createElement("div"); sub.before(sentinel); subObs = new IntersectionObserver(([e]) => sub.classList.toggle("is-stuck", !e.isIntersecting)); subObs.observe(sentinel); }
  }

  /* ================= Overlays ================= */
  let lastFocus = null, sheetHooks = null, overlayKind = null;
  function openSheet(inner, labelledby) {
    closeOverlays(); lastFocus = document.activeElement; overlayKind = "sheet";
    overlayRoot.innerHTML = `<div class="scrim" data-action="close-overlay"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="${labelledby}">${inner}</div>`;
    document.body.style.overflow = "hidden";
    setTimeout(() => $(".sheet button, .sheet input", overlayRoot)?.focus(), 30);
  }
  function openHours(anchor) {
    closeOverlays(); lastFocus = anchor; overlayKind = "hours";
    if (isMobile()) {
      overlayRoot.innerHTML = `<div class="scrim" data-action="close-overlay"></div><div class="popover" role="dialog" aria-modal="true" aria-labelledby="hours-title">${hoursHTML(true)}</div>`;
      document.body.style.overflow = "hidden";
    } else {
      const r = anchor.getBoundingClientRect();
      overlayRoot.innerHTML = `<div class="popover" role="dialog" aria-labelledby="hours-title" style="left:${Math.min(r.left + scrollX, innerWidth - 340)}px;top:${r.bottom + scrollY + 8}px">${hoursHTML(true)}</div>`;
    }
    setTimeout(() => $(".popover .popover__close", overlayRoot)?.focus(), 30);
  }
  function openVideo(videoId, caption) {
    closeOverlays(); lastFocus = document.activeElement; overlayKind = "video";
    overlayRoot.innerHTML = `<div class="vmodal" role="dialog" aria-modal="true" aria-label="${esc(caption)}">
      <button type="button" class="vmodal__close" data-action="close-overlay" data-stop="${videoId}" aria-label="Close video">${icon("close-white.svg", 24)}</button>
      <div class="vmodal__player"><img src="assets/img/d-thumbnail.png" alt="" /><span class="playbtn playbtn--xl">${icon("d-play-circle1.svg", 32)}</span>
        <button type="button" class="vmodal__exit" data-action="close-overlay" data-exit="${videoId}" aria-label="Exit full screen">${icon("corners-in.svg", 24)}</button></div>
      <p class="vmodal__cap">${esc(caption)}</p></div>`;
    document.body.style.overflow = "hidden";
    setTimeout(() => $(".vmodal__close", overlayRoot)?.focus(), 30);
  }
  function openChat(context, el) {
    closeOverlays(); overlayKind = "chat";
    const sid = el?.dataset.id; const s = sid ? storeById(sid) : null;
    const msgs = {
      consultation: [["bot", "Hi! I'm the Carpet Court assistant. I can book a free in-home measure and quote. Which suburb are you in?"]],
      "book-store": (() => { const when = el?.dataset.when || s?.earliest; return [["me", `Book ${when} at ${s?.short}`], ["bot", `Great choice. I've held ${when} at ${s?.name} for 10 minutes. What's your name?`]]; })(),
      "book-panel": (() => { const when = `${WD[new Date(DS.year, DS.month, DS.day).getDay()]} ${DS.day} ${DS.month === 8 ? "Sept" : MONTHS[DS.month].slice(0, 3)}, ${DS.time}`; const st = detailStore(DS.storeId); return [["me", `Book ${when} at ${st.short}`], ["bot", `Lovely. I've held ${when} with Todd at ${st.name} for 10 minutes. What's your name?`]]; })(),
      callback: [["me", "Please call me back"], ["bot", "No problem. Todd will ring you back today. What's the best number to reach you?"]],
    }[context] || [["bot", "Hi! How can I help?"]];
    overlayRoot.innerHTML = `<div class="chat" role="dialog" aria-label="Carpet Court assistant">
      <div class="chat__head"><span class="chat__avatar" aria-hidden="true">C</span><p class="chat__title">Carpet Court assistant<small>AI chat · placeholder</small></p><button type="button" class="chat__close" data-action="close-overlay" aria-label="Close chat">${icon("close-sml.svg", 24)}</button></div>
      <div class="chat__body">${msgs.map(([who, t]) => `<p class="bubble ${who === "me" ? "bubble--me" : ""}">${esc(t)}</p>`).join("")}</div>
      <p class="chat__note">Prototype: the real AI chat takes over from here. Booking forms aren't part of the store pages.</p>
      <div class="chat__input"><input type="text" placeholder="Type a message…" aria-label="Message" disabled /><button type="button" class="btn btn--primary btn--sm" disabled>Send</button></div></div>`;
    lastFocus = el || null;
    setTimeout(() => $(".chat__close", overlayRoot)?.focus(), 30);
  }
  function closeOverlays(opts = {}) {
    if (!overlayRoot.innerHTML) return;
    overlayRoot.innerHTML = ""; document.body.style.overflow = ""; sheetHooks = null; overlayKind = null;
    if (opts.restore !== false && lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  function setPlaying(id, on) {
    const p = document.getElementById(`vp-${id}`); if (!p) return;
    p.classList.toggle("is-playing", on);
    $(".vfeature__play", p).hidden = on;
    let pl = $(".vplaying", p);
    if (on && !pl) {
      p.insertAdjacentHTML("beforeend", `<div class="vplaying"><div class="vplaying__row"><button type="button" class="vplaying__pause" data-action="video-pause" data-video="${id}" aria-label="Pause"></button><div class="vplaying__track"><div class="vplaying__fill"></div></div><span>Playing</span></div></div>`);
      const fill = $(".vplaying__fill", p); let w = 0;
      p._timer = setInterval(() => { w = (w + 0.5) % 100; fill.style.width = w + "%"; }, 120);
      $(".vplaying__pause", p).focus();
    } else if (!on && pl) { clearInterval(p._timer); pl.remove(); $(".vfeature__play", p).focus(); }
  }

  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("is-on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("is-on"), 2600); }
  function scrollToId(id) {
    const el = document.getElementById(id); if (!el) return;
    if (id === "book" && !isMobile()) { // the booking panel sits in the sticky column: scroll to the top of the columns
      const d = $(".details"); window.scrollTo({ top: d.getBoundingClientRect().top + scrollY - 56, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      setTimeout(() => ($("#book .day.is-selected") || el).focus({ preventScroll: true }), 400); return;
    }
    el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    el.setAttribute("tabindex", "-1"); setTimeout(() => el.focus({ preventScroll: true }), 400);
  }

  /* ================= Events ================= */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-action]");
    // Close popups when clicking elsewhere
    if (openDrop && !e.target.closest(".chip-wrap")) closeDropdown();
    if (!e.target.closest("#searchbox") && !$("#suggest")?.hidden) renderSuggest(false);
    if (overlayKind === "hours" && !isMobile() && !e.target.closest(".popover") && !(a && a.dataset.action === "hours")) closeOverlays({ restore: false });
    if (!a) return;
    const act = a.dataset.action;
    switch (act) {
      case "close-promo": $("#promo").hidden = true; try { sessionStorage.setItem("cc-promo-closed", "1"); } catch {} break;
      case "toggle-view": e.preventDefault(); location.hash = L.view === "map" ? "#/" : "#/map"; break;
      case "clear-q": { const i = $("#loc-q"); i.value = ""; L.query = ""; a.hidden = true; i.focus(); suggestIdx = -1; renderSuggest(true); saveL(); break; }
      case "pick": { const v = a.dataset.value; $("#loc-q").value = v; $(".searchbox__clear").hidden = false; renderSuggest(false); runSearch(v); break; }
      case "use-location": e.preventDefault(); useLocation(); break;
      case "loc-change": L.loc = "idle"; updateLocator(); $("#loc-q")?.focus(); break;
      case "drop": openDropdown(a.dataset.key); break;
      case "drop-clear": if (openDrop === "all") draft = { services: [], states: [], weekends: [] }; else draft[openDrop] = []; renderRH(); break;
      case "drop-apply": applyFilters(draft); break;
      case "sort": L.sort = a.dataset.sort; fetchStores(400); break;
      case "open-filter-sheet": openFilterSheet(); break;
      case "sheet-clear": sheetHooks?.clear(); break;
      case "sheet-apply": sheetHooks?.apply(); break;
      case "clear-filters": applyFilters({ services: [], states: [], weekends: [] }); break;
      case "search-another": { window.scrollTo({ top: 0, behavior: "smooth" }); const i = $("#loc-q"); i.value = ""; L.query = ""; i.focus(); renderSuggest(true); break; }
      case "retry": fetchStores(); break;
      case "show-more": L.showAll = true; renderResults(); saveL(); break;
      case "card-style": cardStyle = a.dataset.style; try { localStorage.setItem("cc-card", cardStyle); } catch {} renderResults(); $(`.card-switch [data-style="${cardStyle}"]`)?.focus(); break;
      case "select-store": {
        if (e.target.closest("a,button")) break;
        L.selectedId = a.dataset.id; renderResults(); renderMap(); saveL(); break;
      }
      case "select-pin": {
        L.selectedId = a.dataset.id; renderMap(); renderResults(); saveL();
        if (!isMobile()) $(`.scard[data-id="${a.dataset.id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        break;
      }
      case "close-ssbar": L.selectedId = null; renderMap(); renderResults(); saveL(); break;
      case "zoom": mapState.z = Math.max(1, Math.min(1.6, mapState.z + Number(a.dataset.z) * 0.2)); renderMap(); break;
      case "search-area": mapState.areaLoading = true; mapState.moved = false; renderMap(); setTimeout(() => { mapState.areaLoading = false; L.region = "all"; L.searchedLabel = "this area"; fetchStores(300); }, 900); break;
      case "open-chat": e.preventDefault(); openChat(a.dataset.context, a); break;
      case "close-overlay": {
        const exitId = a.dataset.exit, stopId = a.dataset.stop;
        closeOverlays();
        if (exitId && document.getElementById(`vp-${exitId}`)) setPlaying(exitId, true);
        if (stopId) setPlaying(stopId, false);
        break;
      }
      case "hours": openHours(a); break;
      case "scroll-to": e.preventDefault(); scrollToId(a.dataset.target); break;
      case "faq": {
        const item = a.closest(".faq"), open = a.getAttribute("aria-expanded") === "true";
        a.setAttribute("aria-expanded", String(!open)); item.classList.toggle("is-open", !open); $(".faq__a", item).hidden = open; break;
      }
      case "video-play": setPlaying(a.dataset.video, true); break;
      case "video-pause": setPlaying(a.dataset.video, false); break;
      case "video-full": openVideo(a.dataset.video, a.dataset.caption); break;
      case "pick-day": DS.day = Number(a.dataset.day); DS.time = null; renderBooking(); $(`#book .day[data-day="${DS.day}"]`)?.focus(); break;
      case "pick-time": DS.time = a.dataset.time; renderBooking(); $(`#book .slot[data-time="${DS.time}"]`)?.focus(); break;
      case "month": { DS.month = Math.max(8, Math.min(9, DS.month + Number(a.dataset.dir))); DS.day = DS.month === 8 ? 8 : 1; while (!isAvail(DS.year, DS.month, DS.day)) DS.day++; DS.time = null; renderBooking(); break; }
      case "book-continue": if (DS.time) openChat("book-panel", a); break;
      case "toggle-proto": { const p = $("#proto-panel"); p.hidden = !p.hidden; a.setAttribute("aria-expanded", String(!p.hidden)); break; }
    }
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (sheetHooks && t.closest(".sheet")) return sheetHooks.change(t);
    if (t.closest(".dropdown")) {
      if (t.dataset.group === "sort") { L.sort = t.value; openDrop = null; fetchStores(400); return; }
      toggleIn(draft[t.dataset.group], t.value, t.checked);
    }
  });

  document.addEventListener("submit", (e) => {
    if (e.target.id === "loc-form") {
      e.preventDefault();
      const i = $("#loc-q"), items = suggestItems();
      if (suggestIdx >= 0 && items[suggestIdx]) { items[suggestIdx].click(); return; }
      if (!i.value.trim()) { i.focus(); renderSuggest(true); return; }
      renderSuggest(false); runSearch(i.value);
    }
    if (e.target.matches(".ftr__signup")) {
      e.preventDefault();
      const inp = $("#ftr-email"), msg = $(".ftr__signup-msg"), ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value);
      msg.classList.toggle("is-error", !ok); msg.textContent = ok ? "Thanks! You're on the list." : "Enter a valid email address, like name@example.com.";
      if (ok) inp.value = "";
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "loc-q") { L.query = e.target.value; $(".searchbox__clear").hidden = !e.target.value; suggestIdx = -1; renderSuggest(true); saveL(); }
  });
  document.addEventListener("focusin", (e) => {
    if (e.target.id === "loc-q") renderSuggest(true);
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.id === "loc-q" && !$("#suggest").hidden) {
      const items = suggestItems();
      if (e.key === "ArrowDown" && items.length) { e.preventDefault(); suggestIdx = (suggestIdx + 1) % items.length; renderSuggest(true); }
      else if (e.key === "ArrowUp" && items.length) { e.preventDefault(); suggestIdx = suggestIdx <= 0 ? items.length - 1 : suggestIdx - 1; renderSuggest(true); }
      else if (e.key === "Enter" && suggestIdx >= 0 && items[suggestIdx]) { e.preventDefault(); items[suggestIdx].click(); }
      else if (e.key === "Escape") { e.preventDefault(); renderSuggest(false); }
      else if (e.key === "Tab") renderSuggest(false);
      return;
    }
    if (e.key === "Escape") {
      if (overlayKind) { const v = $(".vmodal__close", overlayRoot); if (v) v.click(); else closeOverlays(); }
      else if (openDrop) closeDropdown();
      else if (!$("#proto-panel").hidden) { $("#proto-panel").hidden = true; $(".proto__toggle").setAttribute("aria-expanded", "false"); }
    }
    // Keep focus inside modal dialogs
    if (e.key === "Tab" && (overlayKind === "sheet" || overlayKind === "video" || (overlayKind === "hours" && isMobile()))) {
      const f = $$("button:not([disabled]), a[href], input:not([disabled])", overlayRoot).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  // Re-render on breakpoint change so layouts swap cleanly (e.g. rotating a tablet).
  mq.addEventListener("change", () => { closeOverlays({ restore: false }); route(); });

  /* ================= Prototype state jumper ================= */
  $("#proto-panel").addEventListener("click", (e) => {
    const b = e.target.closest("[data-proto]"); if (!b) return;
    const k = b.dataset.proto;
    $("#proto-panel").hidden = true; $(".proto__toggle").setAttribute("aria-expanded", "false");
    const reset = () => { L.query = ""; L.searchedLabel = ""; L.region = "all"; L.status = "ready"; L.loc = "idle"; L.filters = { services: [], states: [], weekends: [] }; L.sort = "soonest"; L.selectedId = "nelson-bay"; L.showAll = false; };
    const toLocator = (view = "list") => { const h = view === "map" ? "#/map" : "#/"; if (location.hash !== h) { location.hash = h; return true; } route(); return false; };
    const after = (fn) => setTimeout(fn, 60);
    switch (k) {
      case "locator": reset(); toLocator(); break;
      case "results": reset(); toLocator(); after(() => { $("#loc-q").value = "2315"; runSearch("2315"); }); break;
      case "map": reset(); L.query = "2315"; L.searchedLabel = "2315"; toLocator("map"); break;
      case "suggest": reset(); toLocator(); after(() => { const i = $("#loc-q"); i.value = "Taylor"; L.query = "Taylor"; $(".searchbox__clear").hidden = false; i.focus(); renderSuggest(true); }); break;
      case "loading": reset(); toLocator(); after(() => { $("#loc-q").value = "2315"; L.query = "2315"; L.status = "loading"; updateLocator(); clearTimeout(fetchTimer); }); break;
      case "noresults": reset(); L.query = "2315"; L.searchedLabel = "2315"; L.filters.states = ["VIC"]; toLocator(); break;
      case "error": reset(); toLocator(); after(() => { failNext = true; $("#loc-q").value = "2315"; runSearch("2315"); }); break;
      case "loc-success": reset(); toLocator(); after(() => useLocation("success")); break;
      case "loc-blocked": reset(); toLocator(); after(() => useLocation("blocked")); break;
      case "filters": reset(); toLocator(); after(() => { if (isMobile()) openFilterSheet(); else openDropdown("services"); }); break;
      case "details": location.hash = "#/store/south-melbourne"; break;
      case "hours": location.hash = "#/store/south-melbourne"; after(() => { const l = $('[data-action="hours"]'); l?.scrollIntoView({ block: "center" }); setTimeout(() => openHours(l), 80); }); break;
      case "video": location.hash = "#/store/south-melbourne"; after(() => openVideo("whyus", "2 minutes with Todd")); break;
      case "book": location.hash = "#/store/south-melbourne"; after(() => { DS.day = 10; DS.time = "10:30am"; renderBooking(); scrollToId("book"); }); break;
    }
  });

  /* ================= Boot ================= */
  try { if (sessionStorage.getItem("cc-promo-closed")) $("#promo").hidden = true; } catch {}
  route();
})();
