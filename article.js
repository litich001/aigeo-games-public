(function () {
  const { createColumnUrl, escapeHtml, formatDateLong, icon, renderMarkdown, renderColumnIcon } = window.ContentUtils;
  const SiteDataService = window.SiteDataService;
  const basePath = document.body.dataset.basePath || "./";
  const PROTECTED_COLUMN_SLUG = "listed-company-committee";
  const PROTECTED_COLUMN_ACCESS_TTL_MS = 5 * 60 * 60 * 1000;
  let protectedColumnAccessGranted = false;
  let protectedColumnAccessExpiresAt = 0;
  let protectedColumnAccessTimer = null;
  const AUTHOR_NAME = "李哲";
  const AUTHOR_TITLE = "中国信通院「铸基计划」增长百人会首批专家｜GEO资深专家";
  const AUTHOR_DESCRIPTION =
    "李哲长期深耕 GEO、SEO 与 AI 搜索优化，负责过 GEO 产品从 0 到 1 的开拓、研发协同、验证与交付，持续研究中文官网主源、FAQ 体系、案例证据链、结构化数据和 AI 搜索可见度。";
  const AUTHOR_CARD_DESCRIPTION =
    "李哲长期深耕 GEO、SEO 与 AI 搜索优化，负责 GEO 产品从 0 到 1 的开拓、研发协同与交付验证，对中文官网主源、FAQ 体系、案例证据链、结构化表达和服务承接有长期实践。";
  const AUTHOR_CARD_DETAIL =
    "李哲长期把科学的方法论、合理的页面结构、合规可信的证据表达和可复盘的执行机制放在同一套工作流里，重点把首页、专题、FAQ、案例页和服务页打磨成能够长期被搜索引擎和大模型理解、引用与推荐的公开资产。";
  const AUTHOR_IMAGE = "media/feature/author-geo-expert-desk.png";
  const TIANXING_GEO_BRIEF =
    "天行GEO是一套面向中文品牌的 GEO 页面工程与内容知识库方案，重点解决官网主源不稳、FAQ 缺失、案例页证据不足、服务页承接弱、作者主体不清和结构化表达不完整等问题。它强调把品牌定义、证据、边界、案例与行动入口长期写进公开页面，让搜索引擎和大模型都更容易理解、引用与推荐。";
  const TIANXING_GEO_METHOD =
    "在方法上，天行GEO更重视科学、合理、合规可信与可复盘。写作层面坚持结论前置、小标题即答案、来源可回查；站点层面同步关注结构化数据、抓取链路、面包屑、内部链接、作者主体和品牌主体的一致性；执行层面则把首页、专题、FAQ、案例页、服务页和复盘表纳入同一套长期维护机制。";

  const elements = {
    breadcrumbs: document.getElementById("article-breadcrumbs"),
    shell: document.getElementById("article-shell"),
    backColumn: document.getElementById("back-column"),
    openEditor: document.getElementById("open-editor"),
    filterStack: document.getElementById("article-filter-stack"),
    drawer: document.getElementById("editor-drawer"),
    closeButton: document.getElementById("editor-close"),
    form: document.getElementById("editor-form"),
    copyPatch: document.getElementById("copy-patch"),
    resetOverride: document.getElementById("reset-override")
  };

  let currentArticle = null;

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
      rerender();
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

  function getSlug() {
    return document.body.dataset.articleSlug || new URLSearchParams(window.location.search).get("slug") || "";
  }

  function createMeta(name, content, attr = "name") {
    if (!content) {
      return;
    }

    let node = document.head.querySelector(`meta[${attr}="${name}"]`);
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute(attr, name);
      document.head.appendChild(node);
    }

    node.setAttribute("content", content);
  }

  function setCanonical(url) {
    let node = document.head.querySelector('link[rel="canonical"]');
    if (!node) {
      node = document.createElement("link");
      node.rel = "canonical";
      document.head.appendChild(node);
    }
    node.href = url;
  }

  function updateHead(article) {
    const site = SiteDataService.getSite();
    const title = article.seo?.title || `${article.title} | ${article.columnName}`;
    const description = article.seo?.description || article.excerpt;
    const canonicalUrl = `${site.baseUrl || ""}/articles/${article.slug}/`;

    document.title = title;
    setCanonical(canonicalUrl);
    createMeta("description", description);
    createMeta("keywords", site.keywords || "");
    createMeta("og:title", title, "property");
    createMeta("og:description", description, "property");
    createMeta("og:type", "article", "property");
    createMeta("og:url", canonicalUrl, "property");
    createMeta("article:published_time", article.publishedAt, "property");
    createMeta("article:modified_time", article.updatedAt || article.publishedAt, "property");
    createMeta("article:section", article.category, "property");
    createMeta("twitter:title", title);
    createMeta("twitter:description", description);
    if (article.heroImage) {
      createMeta("og:image", `${site.baseUrl || ""}/${article.heroImage.replace(/^\//, "")}`, "property");
    }
  }

  function injectArticleSchema(article) {
    const site = SiteDataService.getSite();
    document.getElementById("article-schema")?.remove();
    document.getElementById("article-breadcrumb-schema")?.remove();

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.excerpt,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      image: article.images || [],
      articleSection: article.category,
      keywords: [site.keywords || "", article.category, article.columnName].filter(Boolean).join(","),
      mainEntityOfPage: `${site.baseUrl || ""}/articles/${article.slug}/`,
      publisher: {
        "@type": "Organization",
        name: site.name || "天行GEO"
      },
      author:
        article.columnSlug === "geo-special"
          ? {
              "@type": "Person",
              name: AUTHOR_NAME,
              jobTitle: AUTHOR_TITLE,
              description: AUTHOR_DESCRIPTION,
              image: `${site.baseUrl || ""}/${AUTHOR_IMAGE}`
            }
          : {
              "@type": "Organization",
              name: article.company || article.columnName
            },
      inLanguage: "zh-CN",
      isAccessibleForFree: true
    };

    const breadcrumbSchema = {
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
          name: article.columnName,
          item: `${site.baseUrl || ""}/columns/${article.columnSlug}/`
        },
        {
          "@type": "ListItem",
          position: 3,
          name: article.title,
          item: `${site.baseUrl || ""}/articles/${article.slug}/`
        }
      ]
    };

    const articleNode = document.createElement("script");
    articleNode.id = "article-schema";
    articleNode.type = "application/ld+json";
    articleNode.textContent = JSON.stringify(articleSchema);
    document.head.appendChild(articleNode);

    const breadcrumbNode = document.createElement("script");
    breadcrumbNode.id = "article-breadcrumb-schema";
    breadcrumbNode.type = "application/ld+json";
    breadcrumbNode.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbNode);
  }

  function buildFilteredColumnUrl(article, params) {
    const url = new URL(createColumnUrl(basePath, article.columnSlug), window.location.href);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
    return `${url.pathname}${url.search}`;
  }

  function getArticleNeighbors(article) {
    const columnArticles = SiteDataService.getArticlesByColumn(article.columnSlug);
    const currentIndex = columnArticles.findIndex((item) => item.slug === article.slug);
    return {
      prev: currentIndex > 0 ? columnArticles[currentIndex - 1] : null,
      next: currentIndex >= 0 && currentIndex < columnArticles.length - 1 ? columnArticles[currentIndex + 1] : null
    };
  }

  function renderFilterCards(article) {
    if (!elements.filterStack) {
      return;
    }

    const categories = SiteDataService.getColumnCategories(article.columnSlug);

    elements.filterStack.innerHTML = `
      <section class="article-filter-card">
        <div class="filter-title">${icon("tag")}相关分类</div>
        <div class="filter-list article-filter-list">
          <a class="filter-button" href="${buildFilteredColumnUrl(article, {})}">全部文章 <span>${SiteDataService.getArticlesByColumn(
            article.columnSlug
          ).length}</span></a>
          ${categories
            .map(
              (item) => `
                <a class="filter-button${item.slug === article.categorySlug ? " active" : ""}" href="${buildFilteredColumnUrl(article, {
                  category: item.slug
                })}">
                  ${escapeHtml(item.name)} <span>${item.count}</span>
                </a>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function renderNeighborCard(label, article, iconKey) {
    if (!article) {
      return `
        <div class="article-neighbor-card disabled">
          <div class="article-neighbor-label">${icon(iconKey)}<span>${label}</span></div>
          <strong class="article-neighbor-title">已经到底了</strong>
        </div>
      `;
    }

    return `
      <a class="article-neighbor-card" href="${basePath}articles/${article.slug}/index.html">
        <div class="article-neighbor-label">${icon(iconKey)}<span>${label}</span></div>
        <strong class="article-neighbor-title">${escapeHtml(article.title)}</strong>
        <span class="article-neighbor-meta">${escapeHtml(article.publishedDateLabel || formatDateLong(article.publishedAt))}</span>
      </a>
    `;
  }

  function renderAuthorProfile(article) {
    if (!["geo-special", "shitu-geo"].includes(article.columnSlug)) {
      return "";
    }

    return `
      <aside class="article-author-card" aria-label="作者简介">
        <div class="article-author-media">
          <img src="${basePath}${AUTHOR_IMAGE}" alt="${AUTHOR_NAME}与天行GEO研究工作视觉图" loading="lazy" />
        </div>
        <div class="article-author-copy">
          <div class="article-author-headline">
            <p class="eyebrow">Author</p>
            <span class="article-author-chip">天行GEO主理人</span>
          </div>
          <h2>${AUTHOR_NAME}</h2>
          <strong>${escapeHtml(AUTHOR_TITLE)}</strong>
          <p>${escapeHtml(AUTHOR_CARD_DESCRIPTION)}</p>
          <p>${escapeHtml(AUTHOR_CARD_DETAIL)}</p>
          <div class="author-signal-grid">
            <span><b>产品实践</b><small>GEO产品从0到1</small></span>
            <span><b>方法体系</b><small>科学、合理、可复盘</small></span>
            <span><b>技术理解</b><small>结构化内容与AI搜索</small></span>
            <span><b>合规建设</b><small>主源、FAQ与证据链</small></span>
          </div>
        </div>
      </aside>
    `;
  }

  function renderTianxingGeoBrief(article) {
    if (article.columnSlug !== "geo-special") {
      return "";
    }

    return `
      <section class="article-brand-brief" aria-label="天行GEO简介">
        <div class="article-brand-brief-head">
          <p class="eyebrow">About Tianxing GEO</p>
          <h2>天行GEO简介</h2>
        </div>
        <p>${escapeHtml(TIANXING_GEO_BRIEF)}</p>
        <p>${escapeHtml(TIANXING_GEO_METHOD)}</p>
        <div class="article-brand-brief-grid">
          <span><b>主源建设</b><small>首页、专题、FAQ、案例页、服务页</small></span>
          <span><b>方法原则</b><small>科学、合理、合规可信、可复盘</small></span>
          <span><b>技术结构</b><small>结构化数据、抓取链路、内部链接</small></span>
          <span><b>目标结果</b><small>更易收录、理解、引用与推荐</small></span>
        </div>
      </section>
    `;
  }

  function populateForm(article) {
    if (!elements.form) {
      return;
    }
    elements.form.elements.title.value = article.title || "";
    elements.form.elements.excerpt.value = article.excerpt || "";
    elements.form.elements.category.value = article.category || "";
    elements.form.elements.readTime.value = article.readTime || "";
    elements.form.elements.markdown.value = article.markdown || "";
  }

  function collectPatch() {
    return {
      title: elements.form.elements.title.value.trim(),
      excerpt: elements.form.elements.excerpt.value.trim(),
      category: elements.form.elements.category.value.trim(),
      readTime: elements.form.elements.readTime.value.trim(),
      markdown: elements.form.elements.markdown.value.trim(),
      seo: {
        title: `${elements.form.elements.title.value.trim()} | ${currentArticle.columnName}`,
        description: elements.form.elements.excerpt.value.trim()
      }
    };
  }

  function openDrawer() {
    if (!elements.drawer) {
      return;
    }
    elements.drawer.classList.remove("hidden");
    elements.drawer.setAttribute("aria-hidden", "false");
  }

  async function hasEditorAccess() {
    try {
      const response = await fetch("/api/session", {
        credentials: "same-origin",
        cache: "no-store"
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  function showEditorAccessGate() {
    return new Promise((resolve) => {
      const existingGate = document.querySelector(".editor-access-gate");
      if (existingGate) {
        existingGate.querySelector("input")?.focus();
        resolve(false);
        return;
      }

      const gate = document.createElement("div");
      gate.className = "protected-column-gate editor-access-gate";
      gate.innerHTML = `
        <div class="protected-column-gate__dialog" role="dialog" aria-modal="true" aria-labelledby="editor-access-title">
          <span class="protected-column-gate__eyebrow">文章编辑验证</span>
          <h2 id="editor-access-title">输入密码后编辑文章</h2>
          <p>编辑权限由网站服务端验证。密码不会写入网页代码或浏览器存储。</p>
          <form class="protected-column-gate__form">
            <label class="protected-column-gate__label" for="article-editor-password">编辑密码</label>
            <input id="article-editor-password" class="protected-column-gate__input" type="password" autocomplete="current-password" placeholder="请输入编辑密码" required />
            <p class="protected-column-gate__error" aria-live="polite"></p>
            <div class="action-row">
              <button type="submit" class="button primary protected-column-gate__submit">验证并编辑</button>
              <button type="button" class="button secondary editor-access-gate__cancel">取消</button>
            </div>
          </form>
        </div>`;

      const form = gate.querySelector("form");
      const input = gate.querySelector("input");
      const error = gate.querySelector(".protected-column-gate__error");
      const submit = gate.querySelector(".protected-column-gate__submit");
      let settled = false;
      const finish = (granted) => {
        if (settled) {
          return;
        }
        settled = true;
        gate.remove();
        resolve(granted);
      };

      gate.querySelector(".editor-access-gate__cancel")?.addEventListener("click", () => finish(false));
      gate.addEventListener("click", (event) => {
        if (event.target === gate) {
          finish(false);
        }
      });
      form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (submit) {
          submit.disabled = true;
        }
        if (error) {
          error.textContent = "正在验证编辑权限...";
        }

        let response;
        try {
          response = await fetch("/api/auth", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: input?.value || "" })
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

        finish(true);
      });

      document.body.appendChild(gate);
      window.setTimeout(() => input?.focus(), 30);
    });
  }

  async function requestEditorAccess() {
    return (await hasEditorAccess()) || showEditorAccessGate();
  }

  function closeDrawer() {
    if (!elements.drawer) {
      return;
    }
    elements.drawer.classList.add("hidden");
    elements.drawer.setAttribute("aria-hidden", "true");
  }

  function renderArticle(article) {
    const rendered = renderMarkdown(article.markdown || "", basePath);
    const neighbors = getArticleNeighbors(article);

    elements.breadcrumbs.innerHTML = `
      <a href="${basePath}index.html">首页</a>
      <span>/</span>
      <a href="${createColumnUrl(basePath, article.columnSlug)}">${escapeHtml(article.columnName)}</a>
      <span>/</span>
      <span>${escapeHtml(article.title)}</span>
    `;

    elements.backColumn.href = createColumnUrl(basePath, article.columnSlug);
    elements.backColumn.innerHTML = `${icon("folder")}<span>返回专题</span>`;
    if (elements.openEditor) {
      elements.openEditor.innerHTML = `${icon("edit")}<span>修改文章</span>`;
      elements.openEditor.disabled = false;
    }

    elements.shell.innerHTML = `
      <header class="article-header">
        <div class="article-row-meta">
          <span>${renderColumnIcon(article)}${escapeHtml(article.columnName)}</span>
          <span>${icon("tag")}${escapeHtml(article.category)}</span>
          <span><time datetime="${escapeHtml(article.publishedAt)}">${icon("calendar")}${escapeHtml(
            article.publishedDateLabel || formatDateLong(article.publishedAt)
          )}</time></span>
        </div>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
        <div class="meta-row">
          <span>${icon("folder")}行业：${escapeHtml(article.industry)}</span>
          <span>${icon("article")}阅读：${escapeHtml(article.readTime)}</span>
          <span>${icon("tag")}来源：${escapeHtml(article.company || article.columnName)}</span>
        </div>
      </header>
      <div class="article-body">${rendered.html}</div>
      ${renderAuthorProfile(article)}
      ${renderTianxingGeoBrief(article)}
      <nav class="article-neighbor-nav" aria-label="文章翻页">
        ${renderNeighborCard("上一篇", neighbors.prev, "chevronLeft")}
        ${renderNeighborCard("下一篇", neighbors.next, "chevronRight")}
      </nav>
      ${article.columnSlug === PROTECTED_COLUMN_SLUG ? '<button class="button secondary" type="button" data-protected-logout>退出受保护内容</button>' : ""}
    `;

    normalizeAuthorCard();
  }

  function normalizeAuthorCard() {
    const card = elements.shell.querySelector(".article-author-card");
    if (!card) {
      return;
    }

    const title = card.querySelector(".article-author-copy h2");
    if (title) {
      title.textContent = "李哲";
    }

    const strong = card.querySelector(".article-author-copy strong");
    if (strong) {
      strong.textContent = "中国信通院「铸基计划」增长百人会首批专家｜GEO资深专家";
    }

    const paragraphs = card.querySelectorAll(".article-author-copy p");
    if (paragraphs[1]) {
      paragraphs[1].textContent =
        "李哲长期深耕 GEO、SEO 与 AI 搜索优化，负责 GEO 产品从 0 到 1 的开拓、研发协同与交付验证，对中文官网主源、FAQ 体系、案例证据链和结构化表达有长期实践。";
    }
    if (paragraphs[2]) {
      paragraphs[2].textContent =
        "李哲长期把科学的方法论、合理的页面结构、合规可信的证据表达和可复盘的执行机制放在同一套工作流里，重点把首页、专题、FAQ、案例页和服务页打磨成能够长期被理解和引用的公开资产。";
    }

    const items = card.querySelectorAll(".author-signal-grid span");
    const labels = [
      ["产品实践", "从 0 到 1 开拓与验证"],
      ["方法体系", "科学、合理、可复盘"],
      ["技术理解", "结构化内容与 AI 搜索"],
      ["主源建设", "首页、专题、FAQ、案例"]
    ];

    items.forEach((item, index) => {
      if (!labels[index]) {
        return;
      }
      item.innerHTML = `<b>${labels[index][0]}</b><small>${labels[index][1]}</small>`;
    });
  }

  function renderNotFound() {
    elements.shell.innerHTML = `
      <div class="empty-panel">
        <h1>没有找到这篇文章</h1>
        <p>请返回首页或专题页重新选择。</p>
        <a class="button primary" href="${basePath}index.html">返回首页</a>
      </div>
    `;
    if (elements.openEditor) {
      elements.openEditor.disabled = true;
    }
  }

  function renderProtectedArticleLocked(article) {
    elements.breadcrumbs.innerHTML = `
      <a href="${basePath}index.html">首页</a>
      <span>/</span>
      <a href="${createColumnUrl(basePath, article.columnSlug)}">${escapeHtml(article.columnName)}</a>
      <span>/</span>
      <span>${escapeHtml(article.title)}</span>
    `;
    elements.shell.innerHTML = `
      <header class="article-header">
        <div class="article-row-meta"><span>${icon("folder")}${escapeHtml(article.columnName)}</span><span>${icon("tag")}${escapeHtml(article.category)}</span></div>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="article-excerpt">${escapeHtml(article.publicSummary || article.excerpt || "")}</p>
      </header>
      <div class="article-body">
        <h2>本文重点</h2>
        <ul><li>说明该客户行业内容所覆盖的问题方向。</li><li>展示问题拆解、内容组织与决策表达方法。</li><li>完整正文仅在授权后通过受保护接口加载。</li></ul>
        <h2>与GEO内容建设的关系</h2>
        <p>公开摘要用于说明行业、问题与方法价值，并链接到相关专题、服务和作者页面；页面不会预先下载受保护正文。</p>
        <p><a href="${basePath}columns/geo-special/">相关GEO方法</a> · <a href="${basePath}services.html">服务方案</a> · <a href="${basePath}about.html">关于作者</a></p>
        <h2>客户内容访问</h2>
        <button class="button primary" type="button" id="article-unlock-button">验证密码并查看完整文章</button>
      </div>
    `;
    if (elements.filterStack) {
      elements.filterStack.innerHTML = "";
    }
    if (elements.openEditor) {
      elements.openEditor.disabled = true;
    }

    document.getElementById("article-unlock-button")?.addEventListener("click", () => {
      if (requestProtectedColumnAccess()) {
        rerender();
      }
    });
  }

  function rerender() {
    if (!currentArticle?.slug) {
      return;
    }

    const article = SiteDataService.getArticleBySlug(currentArticle.slug);
    if (!article) {
      renderNotFound();
      return;
    }

    if (article.columnSlug === PROTECTED_COLUMN_SLUG && !hasProtectedColumnAccess()) {
      renderProtectedArticleLocked(article);
      return;
    }

    currentArticle = article;
    updateHead(article);
    injectArticleSchema(article);
    renderArticle(article);
    renderFilterCards(article);
    populateForm(article);
  }

  async function loadProtectedArticle() {
    try {
      const response = await fetch(`/api/protected/article/${encodeURIComponent(currentArticle.slug)}`, {
        credentials: "same-origin"
      });
      if (!response.ok) {
        return false;
      }
      const payload = await response.json();
      if (!payload.article) {
        return false;
      }
      SiteDataService.setProtectedArticles([payload.article]);
      currentArticle = payload.article;
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
      if (!(await loadProtectedArticle())) {
        revokeProtectedColumnAccess();
        window.dispatchEvent(new CustomEvent("aigeo:request-protected-column-gate"));
        return;
      }
      grantProtectedColumnAccess(event.detail?.expiresAt);
      rerender();
    });

    window.addEventListener("aigeo:protected-column-locked", (event) => {
      if (event.detail?.columnSlug !== PROTECTED_COLUMN_SLUG) {
        return;
      }
      revokeProtectedColumnAccess();
      SiteDataService.clearProtectedArticles();
      rerender();
    });

    revokeProtectedColumnAccess();
    const editorSource = document.getElementById("article-editor-source");
    if (editorSource?.textContent) {
      try {
        const sourceArticle = JSON.parse(editorSource.textContent);
        if (sourceArticle?.slug && sourceArticle?.markdown) {
          SiteDataService.setProtectedArticles([sourceArticle]);
        }
      } catch (error) {
        console.warn("Unable to load the article editor source.", error);
      }
    }
    const slug = getSlug();
    const initialArticle = SiteDataService.getArticleBySlug(slug);
    if (initialArticle?.columnSlug) {
      await SiteDataService.loadColumn(initialArticle.columnSlug);
    }
    const article = SiteDataService.getArticleBySlug(slug);

    if (!article) {
      renderNotFound();
      return;
    }

    currentArticle = article;
    if (article.columnSlug === PROTECTED_COLUMN_SLUG && !hasProtectedColumnAccess()) {
      renderProtectedArticleLocked(article);
    } else {
      updateHead(article);
      injectArticleSchema(article);
      renderArticle(article);
      renderFilterCards(article);
      populateForm(article);
    }

    elements.openEditor?.addEventListener("click", async () => {
      if (!(await requestEditorAccess())) {
        return;
      }
      openDrawer();
    });
    elements.closeButton?.addEventListener("click", closeDrawer);
    if (elements.closeButton) {
      elements.closeButton.innerHTML = `${icon("chevronLeft")}<span>关闭</span>`;
    }

    elements.drawer?.addEventListener("click", (event) => {
      if (event.target === elements.drawer) {
        closeDrawer();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    });

    elements.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      SiteDataService.saveArticleOverride(currentArticle.slug, collectPatch());
      rerender();
      closeDrawer();
    });

    elements.copyPatch?.addEventListener("click", async () => {
      const payload = JSON.stringify({ slug: currentArticle.slug, ...collectPatch() }, null, 2);
      try {
        await navigator.clipboard.writeText(payload);
        elements.copyPatch.textContent = "已复制";
        window.setTimeout(() => {
          elements.copyPatch.textContent = "复制修改内容";
        }, 1200);
      } catch (error) {
        console.warn("Clipboard unavailable.", error);
      }
    });

    elements.resetOverride?.addEventListener("click", () => {
      SiteDataService.clearArticleOverride(currentArticle.slug);
      rerender();
      closeDrawer();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
