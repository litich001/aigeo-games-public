(function () {
  const { createArticleUrl, createColumnUrl, escapeHtml, icon, renderColumnIcon } = window.ContentUtils;
  const SiteDataService = window.SiteDataService;
  const basePath = document.body.dataset.basePath || "./";
  const currentColumnSlug = document.body.dataset.columnSlug || "";
  const currentArticleSlug = document.body.dataset.articleSlug || "";
  const THEME_KEY = "aigeo-site-theme-v2";
  const PROTECTED_COLUMN_SLUG = "listed-company-committee";
  const PROTECTED_COLUMN_ACCESS_TTL_MS = 5 * 60 * 60 * 1000;
  let protectedColumnAccessGranted = false;
  let protectedColumnAccessExpiresAt = 0;
  let protectedColumnAccessTimer = null;
  const MOBILE_BREAKPOINT = 860;
  const themes = [
    { value: "ocean", label: "海蓝", iconKey: "palette" },
    { value: "sand", label: "暖白", iconKey: "sun" },
    { value: "ink", label: "夜墨", iconKey: "moon" }
  ];

  const elements = {
    siteHeader: document.querySelector(".site-header"),
    headerNav: document.getElementById("site-nav"),
    mobileNavToggle: document.getElementById("mobile-nav-toggle"),
    mobileNavBackdrop: document.getElementById("mobile-nav-backdrop"),
    siteName: document.getElementById("site-name"),
    siteTagline: document.getElementById("site-tagline"),
    homeLink: document.getElementById("home-link"),
    knowledgeLink: document.getElementById("knowledge-link"),
    geoLink: document.getElementById("geo-link"),
    researchLink: document.getElementById("research-link"),
    servicesLink: document.getElementById("services-link"),
    casesLink: document.getElementById("cases-link"),
    aboutLink: document.getElementById("about-link"),
    recentLink: document.getElementById("recent-link"),
    sidebar: document.getElementById("global-sidebar"),
    searchLayer: document.getElementById("global-search-layer"),
    searchClose: document.getElementById("global-search-close"),
    searchInput: document.getElementById("global-search-input"),
    searchColumns: document.getElementById("global-search-columns"),
    searchArticles: document.getElementById("global-search-articles"),
    themeButton: document.getElementById("theme-switcher"),
    globalSearchButton: document.getElementById("global-search-button")
  };

  function getCurrentArticle() {
    return currentArticleSlug ? SiteDataService.getArticleBySlug(currentArticleSlug) : null;
  }

  function getProtectedColumnAccessTarget() {
    const currentArticle = getCurrentArticle();
    const activeColumnSlug = currentColumnSlug || currentArticle?.columnSlug || "";
    return activeColumnSlug === PROTECTED_COLUMN_SLUG ? { columnSlug: activeColumnSlug, article: currentArticle } : null;
  }

  function hasProtectedColumnAccess() {
    return protectedColumnAccessGranted && Date.now() < protectedColumnAccessExpiresAt;
  }

  function storeProtectedColumnAccess(expiresAt = Date.now() + PROTECTED_COLUMN_ACCESS_TTL_MS) {
    protectedColumnAccessGranted = true;
    protectedColumnAccessExpiresAt = expiresAt;
    window.clearTimeout(protectedColumnAccessTimer);
    protectedColumnAccessTimer = window.setTimeout(
      expireProtectedColumnAccess,
      Math.max(0, protectedColumnAccessExpiresAt - Date.now())
    );
  }

  function resetProtectedColumnAccess() {
    protectedColumnAccessGranted = false;
    protectedColumnAccessExpiresAt = 0;
    window.clearTimeout(protectedColumnAccessTimer);
    protectedColumnAccessTimer = null;
  }

  function expireProtectedColumnAccess() {
    const target = getProtectedColumnAccessTarget();
    if (!target) {
      resetProtectedColumnAccess();
      return;
    }

    resetProtectedColumnAccess();
    window.dispatchEvent(
      new CustomEvent("aigeo:protected-column-locked", {
        detail: { columnSlug: PROTECTED_COLUMN_SLUG, reason: "expired" }
      })
    );
    showProtectedColumnGate();
  }

  function expireProtectedColumnAccessIfNeeded() {
    if (!protectedColumnAccessGranted || Date.now() < protectedColumnAccessExpiresAt) {
      return;
    }
    expireProtectedColumnAccess();
  }

  function showProtectedColumnGate() {
    const target = getProtectedColumnAccessTarget();
    if (!target || hasProtectedColumnAccess()) {
      return;
    }

    const existingGate = document.querySelector(".protected-column-gate");
    if (existingGate) {
      existingGate.querySelector("input")?.focus();
      return;
    }

    closeMobileNav();
    closeSearch();

    const gate = document.createElement("div");
    gate.className = "protected-column-gate";
    gate.innerHTML = `
      <div class="protected-column-gate__dialog" role="dialog" aria-modal="true" aria-labelledby="protected-column-gate-title">
        <span class="protected-column-gate__eyebrow">专题访问验证</span>
        <h2 id="protected-column-gate-title">工委会专题已启用访问密码</h2>
        <p>请输入你设置的专题密码后再进入当前栏目与相关文章。</p>
        <form class="protected-column-gate__form">
          <label class="protected-column-gate__label" for="protected-column-password">访问密码</label>
          <input
            id="protected-column-password"
            class="protected-column-gate__input"
            type="password"
            inputmode="text"
            autocomplete="current-password"
            placeholder="请输入专题密码"
            required
          />
          <p class="protected-column-gate__error" aria-live="polite"></p>
          <button type="submit" class="button primary protected-column-gate__submit">进入专题</button>
        </form>
      </div>
    `;

    const form = gate.querySelector("form");
    const input = gate.querySelector("input");
    const error = gate.querySelector(".protected-column-gate__error");

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = input?.value?.trim() || "";
      const submit = gate.querySelector(".protected-column-gate__submit");
      if (submit) {
        submit.disabled = true;
      }
      if (error) {
        error.textContent = "正在验证访问权限...";
      }

      let response;
      try {
        response = await fetch("/api/auth", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password })
        });
      } catch {
        response = null;
      }

      if (!response?.ok) {
        let message = "暂时无法完成验证，请稍后重试。";
        try {
          const payload = await response?.json();
          message = payload?.message || message;
        } catch {
          // Keep the generic error message.
        }
        if (error) {
          error.textContent = message;
        }
        if (submit) {
          submit.disabled = false;
        }
        input?.focus();
        input?.select();
        return;
      }

      const payload = await response.json();
      storeProtectedColumnAccess(payload.expiresAt);
      gate.remove();
      document.body.classList.remove("protected-column-locked");
      window.dispatchEvent(
        new CustomEvent("aigeo:protected-column-unlocked", {
          detail: { columnSlug: PROTECTED_COLUMN_SLUG, expiresAt: protectedColumnAccessExpiresAt }
        })
      );
    });

    document.body.classList.add("protected-column-locked");
    document.body.appendChild(gate);
    window.setTimeout(() => input?.focus(), 30);
  }

  function getDisplaySiteName(name) {
    const wrappers = new Set(["【", "】", "[", "]", "「", "」", "『", "』", '"', "'", "“", "”"]);
    let value = String(name || "天行GEO").trim();
    if (value && wrappers.has(value[0])) {
      value = value.slice(1);
    }
    if (value && wrappers.has(value[value.length - 1])) {
      value = value.slice(0, -1);
    }
    value = value.replace(/（[^）]+）$/u, "").trim();
    return value || "天行GEO";
  }

  function isMobileViewport() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function syncHeaderHeight() {
    const headerHeight = elements.siteHeader?.offsetHeight || 76;
    document.documentElement.style.setProperty("--header-height", `${headerHeight}px`);
  }

  function syncMobileNavAccessibility() {
    if (!elements.headerNav) {
      return;
    }

    if (!isMobileViewport()) {
      document.body.classList.remove("mobile-nav-open");
      elements.headerNav.setAttribute("aria-hidden", "false");
      elements.mobileNavToggle?.setAttribute("aria-expanded", "false");
      return;
    }

    const isOpen = document.body.classList.contains("mobile-nav-open");
    elements.headerNav.setAttribute("aria-hidden", isOpen ? "false" : "true");
    elements.mobileNavToggle?.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function closeMobileNav() {
    document.body.classList.remove("mobile-nav-open");
    syncMobileNavAccessibility();
  }

  function openMobileNav() {
    if (!isMobileViewport()) {
      return;
    }
    document.body.classList.add("mobile-nav-open");
    syncMobileNavAccessibility();
  }

  function toggleMobileNav() {
    if (document.body.classList.contains("mobile-nav-open")) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  }

  function getStoredTheme() {
    try {
      return window.localStorage.getItem(THEME_KEY) || "ocean";
    } catch {
      return "ocean";
    }
  }

  function applyTheme(themeValue) {
    const nextTheme = themes.find((item) => item.value === themeValue) || themes[0];
    document.documentElement.dataset.theme = nextTheme.value;

    try {
      window.localStorage.setItem(THEME_KEY, nextTheme.value);
    } catch {
      // Ignore storage errors.
    }

    if (elements.themeButton) {
      elements.themeButton.innerHTML = `${icon(nextTheme.iconKey)}<span>配色</span>`;
      elements.themeButton.setAttribute("aria-label", `切换配色，当前为${nextTheme.label}`);
      elements.themeButton.setAttribute("title", `切换配色，当前为${nextTheme.label}`);
    }
  }

  function cycleTheme() {
    const current = document.documentElement.dataset.theme || getStoredTheme();
    const index = themes.findIndex((item) => item.value === current);
    const next = themes[(index + 1) % themes.length];
    applyTheme(next.value);
  }

  function renderSidebar() {
    if (!elements.sidebar) {
      return;
    }

    const columns = SiteDataService.getColumns();
    const currentArticle = getCurrentArticle();
    const activeColumnSlug = currentColumnSlug || currentArticle?.columnSlug || "";

    elements.sidebar.innerHTML = `
      <div class="sidebar-panel">
        <div class="sidebar-title">${icon("grid")}<span>专题导航</span></div>
        <nav class="sidebar-nav">
          ${columns
            .map(
              (column) => `
                <a class="sidebar-link${column.slug === activeColumnSlug ? " active" : ""}" href="${createColumnUrl(basePath, column.slug)}">
                  <span class="sidebar-link-main">
                    ${renderColumnIcon(column)}
                    <strong>${escapeHtml(column.name)}</strong>
                  </span>
                  <span class="sidebar-link-meta">${column.articleCount} 篇</span>
                </a>
              `
            )
            .join("")}
        </nav>
      </div>
    `;
  }

  function ensurePrimaryNavLinks() {
    if (!elements.headerNav) {
      return;
    }

    if (!elements.knowledgeLink && elements.geoLink) {
      const link = document.createElement("a");
      link.id = "knowledge-link";
      elements.geoLink.before(link);
      elements.knowledgeLink = link;
    }
  }

  function setActiveNav(target) {
    [
      elements.homeLink,
      elements.knowledgeLink,
      elements.geoLink,
      elements.researchLink,
      elements.servicesLink,
      elements.casesLink,
      elements.aboutLink,
      elements.recentLink
    ].forEach(
      (link) => {
        if (!link) {
          return;
        }
        link.classList.toggle("active", link === target);
      }
    );
  }

  function syncHomeNavState() {
    if (!document.body.classList.contains("page-home")) {
      return;
    }

    const recentSection = document.getElementById("recent");
    const featuredSection = document.getElementById("editor-picks");
    const offset = (elements.siteHeader?.offsetHeight || 72) + 40;
    const scrollY = window.scrollY + offset;

    if (recentSection && scrollY >= recentSection.offsetTop) {
      setActiveNav(elements.recentLink);
      return;
    }

    if (featuredSection && scrollY >= featuredSection.offsetTop) {
      setActiveNav(elements.geoLink);
      return;
    }

    setActiveNav(elements.homeLink);
  }

  function fillHeader() {
    const site = SiteDataService.getSite();
    const displayName = getDisplaySiteName(site.name);
    ensurePrimaryNavLinks();

    if (elements.siteName) {
      elements.siteName.textContent = displayName;
    }

    if (elements.siteTagline) {
      elements.siteTagline.textContent = site.tagline || "中文 GEO / SEO / AI 搜索优化知识库";
    }

    if (elements.homeLink) {
      elements.homeLink.href = `${basePath}index.html`;
      elements.homeLink.innerHTML = `${icon("grid")}<span>首页</span>`;
    }

    if (elements.knowledgeLink) {
      elements.knowledgeLink.href = `${basePath}columns/shitu-geo/index.html`;
      elements.knowledgeLink.innerHTML = `${icon("folder")}<span>GEO知识库</span>`;
    }

    if (elements.geoLink) {
      elements.geoLink.href = `${basePath}columns/geo-special/index.html`;
      elements.geoLink.innerHTML = `${icon("search")}<span>GEO专题</span>`;
    }

    if (elements.researchLink) {
      elements.researchLink.href = `${basePath}research.html`;
      elements.researchLink.innerHTML = `${icon("article")}<span>论文资料</span>`;
    }

    if (elements.servicesLink) {
      elements.servicesLink.href = `${basePath}services.html`;
      elements.servicesLink.innerHTML = `${icon("chip")}<span>服务方案</span>`;
    }

    if (elements.casesLink) {
      elements.casesLink.href = `${basePath}cases.html`;
      elements.casesLink.innerHTML = `${icon("article")}<span>案例解析</span>`;
    }

    if (elements.aboutLink) {
      elements.aboutLink.href = `${basePath}about.html`;
      elements.aboutLink.innerHTML = `${icon("edit")}<span>关于作者</span>`;
    }

    if (elements.recentLink) {
      elements.recentLink.href = `${basePath}index.html#recent`;
      elements.recentLink.innerHTML = `${icon("clock")}<span>最近更新</span>`;
    }

    if (elements.globalSearchButton) {
      elements.globalSearchButton.innerHTML = `${icon("search")}<span>搜索</span>`;
      elements.globalSearchButton.setAttribute("aria-label", "打开全站搜索");
      elements.globalSearchButton.setAttribute("title", "打开全站搜索");
    }

    if (elements.mobileNavToggle) {
      elements.mobileNavToggle.innerHTML = `${icon("grid")}<span>菜单</span>`;
      elements.mobileNavToggle.setAttribute("aria-label", "打开导航菜单");
      elements.mobileNavToggle.setAttribute("title", "打开导航菜单");
    }

    if (document.body.classList.contains("page-home")) {
      syncHomeNavState();
    } else if (document.body.classList.contains("page-article")) {
      const article = getCurrentArticle();
      if (article?.columnSlug === "shitu-geo") {
        setActiveNav(elements.knowledgeLink);
      } else if (article?.columnSlug === "geo-special") {
        setActiveNav(elements.geoLink);
      }
    } else if (document.body.classList.contains("page-services")) {
      setActiveNav(elements.servicesLink);
    } else if (document.body.classList.contains("page-radar")) {
      setActiveNav(elements.knowledgeLink);
    } else if (document.body.classList.contains("page-cases")) {
      setActiveNav(elements.casesLink);
    } else if (document.body.classList.contains("page-about")) {
      setActiveNav(elements.aboutLink);
    } else if (document.body.classList.contains("page-research")) {
      setActiveNav(elements.researchLink);
    } else if (currentColumnSlug === "shitu-geo") {
      setActiveNav(elements.knowledgeLink);
    } else if (currentColumnSlug === "geo-special") {
      setActiveNav(elements.geoLink);
    } else if (currentColumnSlug || currentArticleSlug) {
      setActiveNav(null);
    } else {
      setActiveNav(elements.homeLink);
    }
  }

  async function renderSearch(query) {
    if (!elements.searchColumns || !elements.searchArticles) {
      return;
    }

    const result = await SiteDataService.searchAll(query, 12);

    elements.searchColumns.innerHTML = result.columns.length
      ? result.columns
          .map(
            (column) => `
              <a class="search-result-card" href="${createColumnUrl(basePath, column.slug)}">
                <div class="search-result-meta">${renderColumnIcon(column)}<span>${escapeHtml(column.industry)}</span></div>
                <strong>${escapeHtml(column.name)}</strong>
                <p>${escapeHtml(column.description)}</p>
              </a>
            `
          )
          .join("")
      : '<div class="search-empty">没有找到相关专题。</div>';

    elements.searchArticles.innerHTML = result.articles.length
      ? result.articles
          .map(
            (article) => `
              <a class="search-result-card" href="${createArticleUrl(basePath, article.slug)}">
                <div class="search-result-meta">${icon("article")}<span>${escapeHtml(article.columnName)} / ${escapeHtml(
                  article.category
                )}</span></div>
                <strong>${escapeHtml(article.title)}</strong>
                <p>${escapeHtml(article.excerpt)}</p>
              </a>
            `
          )
          .join("")
      : '<div class="search-empty">没有找到相关文章。</div>';
  }

  function openSearch(initialValue) {
    if (!elements.searchLayer || !elements.searchInput) {
      return;
    }

    closeMobileNav();
    elements.searchLayer.classList.remove("hidden");
    elements.searchLayer.setAttribute("aria-hidden", "false");
    elements.searchInput.value = initialValue || "";
    renderSearch(elements.searchInput.value).catch((error) => console.warn("Unable to load search index.", error));
    window.setTimeout(() => elements.searchInput.focus(), 20);
  }

  function closeSearch() {
    if (!elements.searchLayer) {
      return;
    }

    elements.searchLayer.classList.add("hidden");
    elements.searchLayer.setAttribute("aria-hidden", "true");
  }

  function initMobileNav() {
    syncHeaderHeight();
    syncMobileNavAccessibility();

    window.addEventListener("resize", () => {
      syncHeaderHeight();
      syncMobileNavAccessibility();
      syncHomeNavState();
    });

    window.addEventListener("scroll", syncHomeNavState, { passive: true });

    elements.mobileNavToggle?.addEventListener("click", toggleMobileNav);
    elements.mobileNavBackdrop?.addEventListener("click", closeMobileNav);

    if (elements.headerNav) {
      elements.headerNav.querySelectorAll("a, button").forEach((item) => {
        item.addEventListener("click", () => {
          if (isMobileViewport()) {
            closeMobileNav();
          }
        });
      });
    }
  }

  function initSearch() {
    if (!elements.searchLayer || !elements.searchInput) {
      return;
    }

    document.querySelectorAll("[data-open-search], #global-search-button").forEach((button) => {
      button.addEventListener("click", () => openSearch(button.dataset.searchQuery || ""));
    });

    if (elements.searchClose) {
      elements.searchClose.addEventListener("click", closeSearch);
      elements.searchClose.innerHTML = `${icon("close")}`;
      elements.searchClose.setAttribute("aria-label", "关闭搜索");
      elements.searchClose.setAttribute("title", "关闭搜索");
    }

    elements.searchLayer.addEventListener("click", (event) => {
      if (event.target === elements.searchLayer) {
        closeSearch();
      }
    });

    elements.searchInput.addEventListener("input", (event) => {
      renderSearch(event.target.value || "").catch((error) => console.warn("Unable to load search index.", error));
    });

    const initialQuery = new URLSearchParams(window.location.search).get("q") || "";
    if (initialQuery) {
      openSearch(initialQuery);
    }
  }

  function initKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch(elements.searchInput?.value || "");
      }

      if (event.key === "Escape") {
        closeMobileNav();
        closeSearch();
      }
    });
  }

  function initThemeButton() {
    applyTheme(getStoredTheme());
    elements.themeButton?.addEventListener("click", cycleTheme);
  }

  async function restoreProtectedSession() {
    const target = getProtectedColumnAccessTarget();
    if (!target) {
      return false;
    }
    try {
      const response = await fetch("/api/session", { credentials: "same-origin" });
      if (!response.ok) {
        return false;
      }
      const payload = await response.json();
      if (!payload.authenticated) {
        return false;
      }
      storeProtectedColumnAccess(payload.expiresAt);
      window.dispatchEvent(
        new CustomEvent("aigeo:protected-column-unlocked", {
          detail: { columnSlug: PROTECTED_COLUMN_SLUG, expiresAt: protectedColumnAccessExpiresAt }
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async function logoutProtectedContent() {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // Local state still needs to be cleared if the network request fails.
    }
    resetProtectedColumnAccess();
    window.dispatchEvent(
      new CustomEvent("aigeo:protected-column-locked", {
        detail: { columnSlug: PROTECTED_COLUMN_SLUG, reason: "logout" }
      })
    );
  }

  async function init() {
    resetProtectedColumnAccess();
    fillHeader();
    renderSidebar();
    window.addEventListener("aigeo:request-protected-column-gate", showProtectedColumnGate);
    document.addEventListener("click", (event) => {
      if (event.target.closest?.("[data-protected-logout]")) {
        logoutProtectedContent();
      }
    });
    await restoreProtectedSession();
    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) {
        return;
      }
      resetProtectedColumnAccess();
      window.dispatchEvent(
        new CustomEvent("aigeo:protected-column-locked", {
          detail: { columnSlug: PROTECTED_COLUMN_SLUG, reason: "page-restored" }
        })
      );
    });
    window.addEventListener("focus", expireProtectedColumnAccessIfNeeded);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        expireProtectedColumnAccessIfNeeded();
      }
    });
    initThemeButton();
    initMobileNav();
    initSearch();
    initKeyboardShortcuts();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
