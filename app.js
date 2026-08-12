(function () {
  const { createColumnUrl, escapeHtml, formatDate, icon, renderColumnIcon } = window.ContentUtils;
  const SiteDataService = window.SiteDataService;
  const basePath = document.body.dataset.basePath || "./";

  const elements = {
    introKicker: document.getElementById("intro-kicker"),
    introTitle: document.getElementById("intro-title"),
    introText: document.getElementById("intro-text"),
    heroColumnCount: document.getElementById("hero-column-count"),
    heroArticleCount: document.getElementById("hero-article-count"),
    heroCategoryCount: document.getElementById("hero-category-count"),
    columnGrid: document.getElementById("column-grid"),
    recentList: document.getElementById("recent-list"),
    footerText: document.getElementById("footer-text"),
    featuredTopicCard: document.getElementById("featured-topic-card"),
    featuredTopicCount: document.getElementById("featured-topic-count"),
    featuredTopicText: document.getElementById("featured-topic-text")
  };

  function getDisplaySiteName(name) {
    const wrappers = new Set(["【", "】", "[", "]", "「", "」", "『", "』", '"', "'", "“", "”"]);
    let value = String(name || "天行GEO").trim();
    if (value && wrappers.has(value[0])) {
      value = value.slice(1);
    }
    if (value && wrappers.has(value[value.length - 1])) {
      value = value.slice(0, -1);
    }
    return value || "天行GEO";
  }

  function injectHomepageSchema(site, columns) {
    const displayName = getDisplaySiteName(site.name);
    const schema = [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: displayName,
        description: site.description || "",
        keywords: site.keywords || "",
        url: site.baseUrl || "",
        inLanguage: "zh-CN",
        potentialAction: {
          "@type": "SearchAction",
          target: `${site.baseUrl || ""}/index.html?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        },
        hasPart: columns.map((column) => ({
          "@type": "CollectionPage",
          name: column.name,
          url: `${site.baseUrl || ""}/columns/${column.slug}/`
        }))
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: displayName,
        url: site.baseUrl || ""
      }
    ];

    const node = document.createElement("script");
    node.type = "application/ld+json";
    node.textContent = JSON.stringify(schema);
    document.head.appendChild(node);
  }

  function createColumnCard(column, articles) {
    const latestDate = articles[0] ? formatDate(articles[0].publishedAt) : "待更新";
    return `
      <article class="column-card rail-card">
        <div class="column-card-top">
          <span class="column-card-label">
            ${renderColumnIcon(column)}
            <span class="meta-chip-text">${escapeHtml(column.industry || column.name)}</span>
          </span>
          <span class="meta-chip">${icon("article")}<span>${articles.length} 篇</span></span>
        </div>
        <a class="title-link" href="${createColumnUrl(basePath, column.slug)}">
          <h3>${escapeHtml(column.name)}</h3>
        </a>
        <p class="muted">${escapeHtml(column.description)}</p>
        <div class="meta-row">
          <span>${icon("calendar")}最新：${escapeHtml(latestDate)}</span>
          <span>${icon("tag")}${escapeHtml((column.categories || []).slice(0, 1)[0] || "专题内容")}</span>
        </div>
      </article>
    `;
  }

  function createRecentRow(article) {
    return `
      <article class="compact-article-row">
        <div class="compact-article-meta">
          <span>${renderColumnIcon(article)}</span>
          <span>${escapeHtml(article.columnName)}</span>
          <span>${icon("tag")}${escapeHtml(article.category)}</span>
          <span>${icon("calendar")}${formatDate(article.publishedAt)}</span>
        </div>
        <a class="title-link" href="${basePath}articles/${article.slug}/index.html">
          <h3>${escapeHtml(article.title)}</h3>
        </a>
        <p>${escapeHtml(article.excerpt)}</p>
      </article>
    `;
  }

  function updateHeroStats(columns) {
    const allArticles = columns.flatMap((column) => SiteDataService.getArticlesByColumn(column.slug));
    const categoryCount = new Set(allArticles.map((article) => article.category).filter(Boolean)).size;

    if (elements.heroColumnCount) {
      elements.heroColumnCount.textContent = String(columns.length).padStart(2, "0");
    }
    if (elements.heroArticleCount) {
      elements.heroArticleCount.textContent = String(allArticles.length).padStart(2, "0");
    }
    if (elements.heroCategoryCount) {
      elements.heroCategoryCount.textContent = String(categoryCount).padStart(2, "0");
    }
  }

  function fillFeaturedTopic() {
    const geoColumn = SiteDataService.getColumnBySlug("geo-special");
    const geoArticles = SiteDataService.getArticlesByColumn("geo-special");
    if (!geoColumn || !elements.featuredTopicCard) {
      return;
    }

    elements.featuredTopicCard.href = createColumnUrl(basePath, geoColumn.slug);
    if (elements.featuredTopicCount) {
      elements.featuredTopicCount.textContent = `${geoArticles.length} 篇`;
    }
    if (elements.featuredTopicText && !elements.featuredTopicText.textContent.trim()) {
      elements.featuredTopicText.textContent =
        geoColumn.description || "从基础概念、内容结构、页面设计到服务转化，把 GEO 这件事讲清楚。";
    }
  }

  function init() {
    const site = SiteDataService.getSite();
    const columns = SiteDataService.getColumns();
    const populatedColumns = columns.filter((column) => column.articleCount > 0);
    const allArticles = SiteDataService.getArticles();
    const recentArticles = allArticles.filter((article) => !article.requiresAuth).slice(0, 8);
    const clientRecentArticles = allArticles.filter((article) => article.requiresAuth).slice(0, 4);
    const coreSlugs = new Set(["geo-special", "shitu-geo"]);
    const coreColumns = populatedColumns.filter((column) => coreSlugs.has(column.slug));
    const practiceColumns = populatedColumns.filter((column) => !coreSlugs.has(column.slug));
    const displayName = getDisplaySiteName(site.name);

    document.title = `${displayName} | 李哲主理的 GEO/SEO/AI 搜索优化知识库`;

    if (elements.introKicker) {
      elements.introKicker.textContent = "GEO 内容工程研究站";
    }
    if (elements.introTitle) {
      elements.introTitle.textContent = displayName;
    }
    if (elements.introText && !elements.introText.textContent.trim()) {
      elements.introText.textContent =
        "这里持续整理 GEO、SEO 与 AI 搜索优化的公开方法，重点覆盖主源页面、FAQ 体系、案例证据、服务页承接和知识库结构，让读者、搜索引擎与大模型都能更准确地理解品牌。";
    }
    if (elements.footerText) {
      elements.footerText.textContent = displayName;
    }

    updateHeroStats(columns);
    fillFeaturedTopic();

    if (elements.columnGrid) {
      elements.columnGrid.innerHTML = `
        <div class="column-group-heading"><strong>核心研究与方法</strong><span>GEO专题、知识库与公开研究入口</span></div>
        ${coreColumns.map((column) => createColumnCard(column, SiteDataService.getArticlesByColumn(column.slug))).join("")}
        <div class="column-group-heading"><strong>客户行业内容实践</strong><span>行业专题、客户服务与GEO内容实践</span></div>
        ${practiceColumns.map((column) => createColumnCard(column, SiteDataService.getArticlesByColumn(column.slug))).join("")}
      `;
    }

    if (elements.recentList) {
      elements.recentList.innerHTML = `
        <div class="content-stream-heading"><strong>公开研究更新</strong><span>可直接阅读与收录</span></div>
        <div class="compact-article-list">${recentArticles.map(createRecentRow).join("")}</div>
        ${clientRecentArticles.length ? `<div class="content-stream-heading"><strong>客户专题更新</strong><span>公开摘要，完整内容需授权</span></div><div class="compact-article-list">${clientRecentArticles.map(createRecentRow).join("")}</div>` : ""}
      `;
    }

    injectHomepageSchema(site, columns);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
