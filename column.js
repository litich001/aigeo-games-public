(function () {
  const { createArticleUrl, escapeHtml, formatDateLong, icon, renderColumnIcon } = window.ContentUtils;
  const SiteDataService = window.SiteDataService;
  const basePath = document.body.dataset.basePath || "./";
  const MOBILE_BREAKPOINT = 960;
  const DESKTOP_PAGE_SIZE = 10;
  const MOBILE_BATCH_SIZE = 8;
  const PROTECTED_COLUMN_SLUG = "listed-company-committee";
  const PROTECTED_COLUMN_ACCESS_TTL_MS = 5 * 60 * 60 * 1000;
  let protectedColumnAccessGranted = false;
  let protectedColumnAccessExpiresAt = 0;
  let protectedColumnAccessTimer = null;

  const elements = {
    breadcrumbs: document.getElementById("column-breadcrumbs"),
    intro: document.getElementById("column-intro"),
    researchSection: document.getElementById("geo-research-section"),
    metaText: document.getElementById("column-meta-text"),
    articles: document.getElementById("column-articles"),
    pagination: document.getElementById("column-pagination"),
    dateFilterList: document.getElementById("date-filter-list"),
    categoryFilterList: document.getElementById("category-filter-list"),
    yearFilterList: document.getElementById("year-filter-list")
  };

  function hasProtectedColumnAccess() {
    return protectedColumnAccessGranted && Date.now() < protectedColumnAccessExpiresAt;
  }

  function revokeProtectedColumnAccess() {
    protectedColumnAccessGranted = false;
    protectedColumnAccessExpiresAt = 0;
    window.clearTimeout(protectedColumnAccessTimer);
    protectedColumnAccessTimer = null;
  }

  function grantProtectedColumnAccess(expiresAt = Date.now() + PROTECTED_COLUMN_ACCESS_TTL_MS) {
    protectedColumnAccessGranted = true;
    protectedColumnAccessExpiresAt = expiresAt;
    window.clearTimeout(protectedColumnAccessTimer);
    protectedColumnAccessTimer = window.setTimeout(() => {
      revokeProtectedColumnAccess();
      render();
      window.dispatchEvent(
        new CustomEvent("aigeo:request-protected-column-gate", {
          detail: { columnSlug: PROTECTED_COLUMN_SLUG, reason: "expired" }
        })
      );
    }, Math.max(0, expiresAt - Date.now()));
  }

  function requestProtectedColumnAccess() {
    window.dispatchEvent(
      new CustomEvent("aigeo:request-protected-column-gate", {
        detail: { columnSlug: PROTECTED_COLUMN_SLUG }
      })
    );
    return false;
  }

  function renderProtectedColumnLocked(column) {
    const columnName = column?.name || "工委会";
    elements.breadcrumbs.innerHTML = `
      <a href="${basePath}index.html">首页</a>
      <span>/</span>
      <span>${escapeHtml(columnName)}</span>
    `;
    elements.intro.innerHTML = `
      <div class="column-hero-head">${renderColumnIcon(column)}<div><p class="eyebrow">Client Content Practice</p><h1>${escapeHtml(columnName)}</h1></div></div>
      <p>${escapeHtml(column?.description || "本专题为客户专项内容服务区，公开展示专题方向和方法说明，完整内容需授权访问。")}</p>
      <div class="meta-row"><span>${icon("article")}持续更新：${column?.articleCount || 0} 篇</span><span>${icon("calendar")}最近更新：${column?.latestPublishedAt ? formatDateLong(column.latestPublishedAt) : "暂无"}</span></div>
      <div class="column-map-grid"><article class="column-map-card"><h3>产业协同</h3><p>组织平台、资源与企业需求信息。</p></article><article class="column-map-card"><h3>并购合作</h3><p>说明条件、边界与决策问题。</p></article><article class="column-map-card"><h3>生态沉淀</h3><p>连接机制、案例与公开资料。</p></article></div>
      <button class="button primary" type="button" id="column-unlock-button">验证密码并查看完整内容</button>
    `;
    elements.metaText.textContent = "当前专题已上锁";
    elements.articles.innerHTML = "";
    elements.pagination.innerHTML = "";
    if (elements.researchSection) {
      elements.researchSection.innerHTML = "";
      elements.researchSection.classList.add("hidden");
    }
    if (elements.dateFilterList) {
      elements.dateFilterList.innerHTML = "";
    }
    if (elements.categoryFilterList) {
      elements.categoryFilterList.innerHTML = "";
    }
    if (elements.yearFilterList) {
      elements.yearFilterList.innerHTML = "";
    }

    document.getElementById("column-unlock-button")?.addEventListener("click", () => {
      if (requestProtectedColumnAccess()) {
        render();
      }
    });
  }

  function renderGeoSpecialIntro(column) {
    return `
      <div class="column-hero-head">
        ${renderColumnIcon(column)}
        <div>
          <p class="eyebrow">${escapeHtml(column.industry)}</p>
          <h1>${escapeHtml(column.name)}</h1>
        </div>
      </div>
      <p>${escapeHtml(column.description)}</p>
      <div class="meta-row">
        <span>${icon("folder")}来源：${escapeHtml(column.company || "待补充")}</span>
        <span>${icon("article")}文章：${column.articleCount} 篇</span>
        <span>${icon("calendar")}最近更新：${column.latestPublishedAt ? formatDateLong(column.latestPublishedAt) : "暂无"}</span>
      </div>
      <div class="column-map-grid">
        <article class="column-map-card">
          <p class="eyebrow">Layer 01</p>
          <h3>认知层</h3>
          <p>先回答什么是 GEO、为什么做、和 SEO / AEO / AI 搜索优化有什么边界差异。</p>
        </article>
        <article class="column-map-card">
          <p class="eyebrow">Layer 02</p>
          <h3>结构层</h3>
          <p>再看首页、专题、FAQ、案例页、服务页和作者页应该分别承担什么角色。</p>
        </article>
        <article class="column-map-card">
          <p class="eyebrow">Layer 03</p>
          <h3>证据层</h3>
          <p>把公开信源、案例过程、FAQ 答案和结构化数据放到正确位置，避免只剩观点没有依据。</p>
        </article>
        <article class="column-map-card">
          <p class="eyebrow">Layer 04</p>
          <h3>承接层</h3>
          <p>最后才是服务页、咨询入口、月度复盘和可见度监测，让问题能回到真实业务。</p>
        </article>
      </div>
      <div class="column-path-grid">
        <a class="column-path-card" href="${basePath}articles/geo-special-01/index.html">
          <strong>第一次进入专题</strong>
          <p>先看定义、误区和 90 天路线图，快速建立 GEO 的基础判断框架。</p>
          <div class="column-path-tags">
            <span>什么是 GEO</span>
            <span>常见误区</span>
            <span>90天路线图</span>
          </div>
        </a>
        <a class="column-path-card" href="${basePath}articles/geo-special-21/index.html">
          <strong>已经在改官网</strong>
          <p>从问题地图、首页、FAQ、案例页和服务页开始，一层层把站点主干补起来。</p>
          <div class="column-path-tags">
            <span>问题地图</span>
            <span>首页改写</span>
            <span>FAQ</span>
          </div>
        </a>
        <a class="column-path-card" href="${basePath}articles/geo-special-41/index.html">
          <strong>想看研究与方法</strong>
          <p>从论文精读、引用机制、结构特征、仪表盘和中文传播策略往下看。</p>
          <div class="column-path-tags">
            <span>论文精读</span>
            <span>引用机制</span>
            <span>监测评估</span>
          </div>
        </a>
      </div>
    `;
  }

  function renderShituGeoIntro(column) {
    return `
      <div class="column-hero-head">
        ${renderColumnIcon(column)}
        <div>
          <p class="eyebrow">${escapeHtml(column.industry)}</p>
          <h1>${escapeHtml(column.name)}</h1>
        </div>
      </div>
      <p>${escapeHtml(column.description)}</p>
      <div class="meta-row">
        <span>${icon("folder")}来源：${escapeHtml(column.company || "待补充")}</span>
        <span>${icon("article")}文章：${column.articleCount} 篇</span>
        <span>${icon("calendar")}最近更新：${column.latestPublishedAt ? formatDateLong(column.latestPublishedAt) : "暂无"}</span>
      </div>
      <div class="column-map-grid">
        <article class="column-map-card">
          <p class="eyebrow">Track 01</p>
          <h3>全球产品观察</h3>
          <p>适合先看总览，快速区分页面工程、监测平台、中文问题池和基础体检工具。</p>
        </article>
        <article class="column-map-card">
          <p class="eyebrow">Track 02</p>
          <h3>平台与工具</h3>
          <p>适合已经有内容团队，正在补监测视图、问题发现和月度复盘工具的团队。</p>
        </article>
        <article class="column-map-card">
          <p class="eyebrow">Track 03</p>
          <h3>国产能力与站点工程</h3>
          <p>更适合中文品牌，重点看官网主源、FAQ、案例页、百度生态和结构化表达。</p>
        </article>
        <article class="column-map-card">
          <p class="eyebrow">Track 04</p>
          <h3>行业场景选型</h3>
          <p>把 ToB、本地服务、创始人 IP 和知识库型官网拆开看，不再用一张榜单套所有项目。</p>
        </article>
      </div>
      <div class="column-path-grid">
        <a class="column-path-card" href="${basePath}articles/shitu-geo-51/index.html">
          <strong>先看总榜</strong>
          <p>先用总榜和六维快照建立全局判断，再去看具体场景与方法文章。</p>
          <div class="column-path-tags">
            <span>总榜</span>
            <span>六维快照</span>
            <span>场景矩阵</span>
          </div>
        </a>
        <a class="column-path-card" href="${basePath}articles/shitu-geo-31/index.html">
          <strong>更关心官网怎么改</strong>
          <p>优先看站点工程方法组，先把首页、专题、FAQ、案例页和服务页站稳。</p>
          <div class="column-path-tags">
            <span>首页</span>
            <span>FAQ</span>
            <span>案例页</span>
          </div>
        </a>
        <a class="column-path-card" href="${basePath}articles/shitu-geo-41/index.html">
          <strong>需要按行业选型</strong>
          <p>从 ToB、本地服务、教育咨询和创始人 IP 场景切入，少走一大圈试错。</p>
          <div class="column-path-tags">
            <span>ToB</span>
            <span>本地服务</span>
            <span>个人IP</span>
          </div>
        </a>
      </div>
    `;
  }

  function isMobileViewport() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function getSlug() {
    return document.body.dataset.columnSlug || new URLSearchParams(window.location.search).get("slug") || "";
  }

  function getState() {
    const params = new URLSearchParams(window.location.search);
    return {
      date: params.get("date") || "",
      category: params.get("category") || "",
      year: params.get("year") || "",
      page: Math.max(1, Number(params.get("page") || 1))
    };
  }

  function updateState(patch) {
    const url = new URL(window.location.href);
    const next = { ...getState(), ...patch };

    if (next.date) {
      url.searchParams.set("date", next.date);
    } else {
      url.searchParams.delete("date");
    }

    if (next.category) {
      url.searchParams.set("category", next.category);
    } else {
      url.searchParams.delete("category");
    }

    if (next.year) {
      url.searchParams.set("year", next.year);
    } else {
      url.searchParams.delete("year");
    }

    if (next.page > 1) {
      url.searchParams.set("page", String(next.page));
    } else {
      url.searchParams.delete("page");
    }

    window.history.replaceState({}, "", url);
    render();
  }

  function createArticleRow(article) {
    return `
      <article class="article-row">
        <div class="article-row-meta">
          <span>${icon("calendar")}${escapeHtml(article.publishedDateLabel || formatDateLong(article.publishedAt))}</span>
          <span>${icon("tag")}${escapeHtml(article.category)}</span>
          <span>${icon("article")}${escapeHtml(article.readTime)}</span>
        </div>
        <a class="title-link" href="${createArticleUrl(basePath, article.slug)}">
          <h3>${escapeHtml(article.title)}</h3>
        </a>
        <p>${escapeHtml(article.excerpt)}</p>
      </article>
    `;
  }

  function renderDateFilters(columnSlug, state) {
    if (!elements.dateFilterList) {
      return;
    }

    const dates = SiteDataService.getColumnDates(columnSlug);
    elements.dateFilterList.innerHTML = `
      <button class="filter-button${!state.date ? " active" : ""}" type="button" data-date="">
        全部日期
      </button>
      ${dates
        .map(
          (item) => `
            <button class="filter-button${state.date === item.value ? " active" : ""}" type="button" data-date="${escapeHtml(item.value)}">
              ${escapeHtml(item.label)} <span>${item.count}</span>
            </button>
          `
        )
        .join("")}
    `;

    elements.dateFilterList.querySelectorAll("[data-date]").forEach((button) => {
      button.addEventListener("click", () => updateState({ date: button.dataset.date || "", page: 1 }));
    });
  }

  function renderCategoryFilters(columnSlug, state) {
    if (!elements.categoryFilterList) {
      return;
    }

    const categories = SiteDataService.getColumnCategories(columnSlug);
    elements.categoryFilterList.innerHTML = `
      <button class="filter-button${!state.category ? " active" : ""}" type="button" data-category="">
        全部分类
      </button>
      ${categories
        .map(
          (item) => `
            <button class="filter-button${state.category === item.slug ? " active" : ""}" type="button" data-category="${escapeHtml(
              item.slug
            )}">
              ${escapeHtml(item.name)} <span>${item.count}</span>
            </button>
          `
        )
        .join("")}
    `;

    elements.categoryFilterList.querySelectorAll("[data-category]").forEach((button) => {
      button.addEventListener("click", () => updateState({ category: button.dataset.category || "", page: 1 }));
    });
  }

  function renderYearFilters(columnSlug, state) {
    if (!elements.yearFilterList) {
      return;
    }

    const years = SiteDataService.getColumnYears(columnSlug);
    elements.yearFilterList.innerHTML = `
      <button class="filter-button${!state.year ? " active" : ""}" type="button" data-year="">
        全部年份
      </button>
      ${years
        .map(
          (item) => `
            <button class="filter-button${state.year === item.value ? " active" : ""}" type="button" data-year="${escapeHtml(item.value)}">
              ${escapeHtml(item.value)} <span>${item.count}</span>
            </button>
          `
        )
        .join("")}
    `;

    elements.yearFilterList.querySelectorAll("[data-year]").forEach((button) => {
      button.addEventListener("click", () => updateState({ year: button.dataset.year || "", page: 1 }));
    });
  }

  function renderDesktopPagination(pageData) {
    if (!elements.pagination) {
      return;
    }

    if (pageData.totalPages <= 1) {
      elements.pagination.innerHTML = "";
      return;
    }

    const pageButtons = [];
    for (let page = 1; page <= pageData.totalPages; page += 1) {
      pageButtons.push(`
        <button class="pagination-button${page === pageData.currentPage ? " active" : ""}" type="button" data-page="${page}">
          ${page}
        </button>
      `);
    }

    elements.pagination.innerHTML = `
      <button class="pagination-button" type="button" data-page="${Math.max(1, pageData.currentPage - 1)}" ${
        pageData.currentPage === 1 ? "disabled" : ""
      }>
        ${icon("chevronLeft")}上一页
      </button>
      ${pageButtons.join("")}
      <button class="pagination-button" type="button" data-page="${Math.min(pageData.totalPages, pageData.currentPage + 1)}" ${
        pageData.currentPage === pageData.totalPages ? "disabled" : ""
      }>
        下一页${icon("chevronRight")}
      </button>
    `;

    elements.pagination.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => updateState({ page: Number(button.dataset.page || 1) }));
    });
  }

  function renderMobilePagination(filteredItems, state) {
    if (!elements.pagination) {
      return;
    }

    const visibleCount = Math.min(filteredItems.length, state.page * MOBILE_BATCH_SIZE);
    const hasMore = visibleCount < filteredItems.length;

    elements.pagination.innerHTML = `
      <button class="button secondary" type="button" id="column-load-more" ${hasMore ? "" : "disabled"}>
        ${hasMore ? "继续查看更多文章" : "已经到底了"}
      </button>
    `;

    const loadMoreButton = document.getElementById("column-load-more");
    if (loadMoreButton && hasMore) {
      loadMoreButton.addEventListener("click", () => updateState({ page: state.page + 1 }));
    }
  }

  function renderNotFound() {
    elements.intro.innerHTML = `
      <div class="empty-panel">
        <h1>没有找到这个专题</h1>
        <p>请返回首页重新选择。</p>
        <a class="button primary" href="${basePath}index.html">返回首页</a>
      </div>
    `;
    elements.articles.innerHTML = "";
    elements.pagination.innerHTML = "";
  }

  function renderResearchSection() {
    if (!elements.researchSection) {
      return;
    }

    const papers = window.GEOResearchLibrary?.papers || [];
    if (getSlug() !== "shitu-geo" || !papers.length) {
      elements.researchSection.classList.add("hidden");
      elements.researchSection.innerHTML = "";
      return;
    }

    elements.researchSection.classList.remove("hidden");
    elements.researchSection.id = "research";
    elements.researchSection.innerHTML = `
      <div class="section-head">
        <div>
          <p class="eyebrow">Research</p>
          <h2>GEO 论文资料</h2>
        </div>
        <p>论文资料已单独整理成资料库页，这里优先呈现可直接阅读的专题文章。需要回查研究原文时，可以按 GEO 基础、方法优化、测量评估、AEO、AI 搜索实证和风险对抗分类进入。</p>
      </div>
      <article class="resource-card resource-card-featured">
        <div class="resource-meta-line">
          <span class="resource-badge">论文资料库</span>
          <span class="resource-subtitle">${papers.length} 份 PDF</span>
        </div>
        <h3>GEO / SEO / AI Search 论文资料库</h3>
        <p>这里集中放置论文原文、年份、来源、用途说明和原始链接，适合在阅读专题后继续回查证据。</p>
        <div class="resource-actions">
          <a class="button primary" href="${basePath}research.html">进入论文资料库</a>
        </div>
      </article>
    `;
  }

  function injectColumnSchema(site, column, items) {
    document.getElementById("column-schema")?.remove();
    document.getElementById("column-breadcrumb-schema")?.remove();

    const schema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: column.name,
      description: column.description,
      url: `${site.baseUrl || ""}/columns/${column.slug}/`,
      isPartOf: {
        "@type": "WebSite",
        name: site.name || "天行GEO",
        url: site.baseUrl || ""
      },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: items.map((article, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${site.baseUrl || ""}/articles/${article.slug}/`,
          name: article.title
        }))
      }
    };

    const node = document.createElement("script");
    node.id = "column-schema";
    node.type = "application/ld+json";
    node.textContent = JSON.stringify(schema);
    document.head.appendChild(node);

    const breadcrumbNode = document.createElement("script");
    breadcrumbNode.id = "column-breadcrumb-schema";
    breadcrumbNode.type = "application/ld+json";
    breadcrumbNode.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "首页",
          item: `${site.baseUrl || ""}/index.html`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: column.name,
          item: `${site.baseUrl || ""}/columns/${column.slug}/`
        }
      ]
    });
    document.head.appendChild(breadcrumbNode);
  }

  function render() {
    const slug = getSlug();
    const site = SiteDataService.getSite();
    const column = SiteDataService.getColumnBySlug(slug);

    if (!column) {
      renderNotFound();
      return;
    }

    if (slug === PROTECTED_COLUMN_SLUG && !hasProtectedColumnAccess()) {
      renderProtectedColumnLocked(column);
      return;
    }

    const state = getState();
    const isMobile = isMobileViewport();
    const filteredResult = SiteDataService.getColumnPage(slug, {
      date: state.date,
      category: state.category,
      year: state.year,
      page: 1,
      pageSize: 9999
    });

    const filteredItems = filteredResult.items;
    const visibleItems = isMobile
      ? filteredItems.slice(0, Math.min(filteredItems.length, state.page * MOBILE_BATCH_SIZE))
      : SiteDataService.getColumnPage(slug, {
          date: state.date,
          category: state.category,
          year: state.year,
          page: state.page,
          pageSize: DESKTOP_PAGE_SIZE
        }).items;

    const totalPages = isMobile
      ? Math.max(1, Math.ceil(filteredItems.length / MOBILE_BATCH_SIZE))
      : Math.max(1, Math.ceil(filteredItems.length / DESKTOP_PAGE_SIZE));

    document.title =
      column.slug === PROTECTED_COLUMN_SLUG
        ? `${column.name}客户内容实践与产业协同专题 | ${site.name || "天行GEO"}`
        : `${column.name}内容实践、问题指南与GEO方法 | ${site.name || "天行GEO"}`;

    elements.breadcrumbs.innerHTML = `
      <a href="${basePath}index.html">首页</a>
      <span>/</span>
      <span>${escapeHtml(column.name)}</span>
    `;

    if (slug === "geo-special") {
      elements.intro.innerHTML = renderGeoSpecialIntro(column);
    } else if (slug === "shitu-geo") {
      elements.intro.innerHTML = renderShituGeoIntro(column);
    } else {
      elements.intro.innerHTML = `
        <div class="column-hero-head">
          ${renderColumnIcon(column)}
          <div>
            <p class="eyebrow">${escapeHtml(column.industry)}</p>
            <h1>${escapeHtml(column.name)}</h1>
          </div>
        </div>
        <p>${escapeHtml(column.description)}</p>
        <div class="meta-row">
          <span>${icon("folder")}来源：${escapeHtml(column.company || "待补充")}</span>
          <span>${icon("article")}文章：${column.articleCount} 篇</span>
          <span>${icon("calendar")}最近更新：${column.latestPublishedAt ? formatDateLong(column.latestPublishedAt) : "暂无"}</span>
        </div>
        ${slug === PROTECTED_COLUMN_SLUG ? '<button class="button secondary" type="button" data-protected-logout>退出受保护内容</button>' : ""}
      `;
    }

    if (isMobile) {
      elements.metaText.textContent = `共 ${filteredItems.length} 篇，当前已展示 ${visibleItems.length} 篇，可继续下滑浏览。`;
    } else {
      elements.metaText.textContent = `共 ${filteredItems.length} 篇，当前第 ${state.page} / ${totalPages} 页，每页最多 ${DESKTOP_PAGE_SIZE} 篇。`;
    }

    elements.articles.innerHTML = visibleItems.length
      ? visibleItems.map(createArticleRow).join("")
      : '<div class="empty-panel"><h3>这个专题暂时没有可展示的文章</h3><p>后续把新文章放进对应内容源后，这里会自动更新。</p></div>';

    renderResearchSection();
    renderDateFilters(slug, state);
    renderCategoryFilters(slug, state);
    renderYearFilters(slug, state);

    if (isMobile) {
      renderMobilePagination(filteredItems, state);
    } else {
      renderDesktopPagination({
        currentPage: state.page,
        totalPages
      });
    }

    injectColumnSchema(site, column, visibleItems);
  }

  let resizeTimer = null;

  async function loadProtectedColumnArticles() {
    try {
      const response = await fetch(`/api/protected/column/${PROTECTED_COLUMN_SLUG}`, {
        credentials: "same-origin"
      });
      if (!response.ok) {
        return false;
      }
      const payload = await response.json();
      SiteDataService.setProtectedArticles(payload.articles || []);
      return true;
    } catch {
      return false;
    }
  }

  async function init() {
    window.addEventListener("aigeo:protected-column-unlocked", async (event) => {
      if (event.detail?.columnSlug !== PROTECTED_COLUMN_SLUG) {
        return;
      }
      if (!(await loadProtectedColumnArticles())) {
        revokeProtectedColumnAccess();
        window.dispatchEvent(new CustomEvent("aigeo:request-protected-column-gate"));
        return;
      }
      grantProtectedColumnAccess(event.detail?.expiresAt);
      render();
    });

    window.addEventListener("aigeo:protected-column-locked", (event) => {
      if (event.detail?.columnSlug !== PROTECTED_COLUMN_SLUG) {
        return;
      }
      revokeProtectedColumnAccess();
      SiteDataService.clearProtectedArticles();
      render();
    });

    revokeProtectedColumnAccess();
    await SiteDataService.loadColumn(getSlug());
    render();

    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(render, 120);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
