(function () {
  const { escapeHtml, icon } = window.ContentUtils;
  const SiteDataService = window.SiteDataService;

  const elements = {
    breadcrumbs: document.getElementById("research-breadcrumbs"),
    head: document.getElementById("research-head"),
    actions: document.getElementById("research-actions"),
    facts: document.getElementById("research-facts"),
    frame: document.getElementById("research-frame")
  };

  function getSlug() {
    return new URLSearchParams(window.location.search).get("slug") || "";
  }

  function getPaper() {
    const slug = getSlug();
    return (window.GEOResearchLibrary?.papers || []).find((item) => item.slug === slug) || null;
  }

  function setViewerVisible(visible) {
    const viewer = elements.frame?.closest(".research-viewer");
    if (viewer) {
      viewer.classList.toggle("hidden", !visible);
    }
  }

  function renderLibrary() {
    const papers = window.GEOResearchLibrary?.papers || [];
    const groups = papers.reduce((map, paper) => {
      const key = paper.badge || "论文资料";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(paper);
      return map;
    }, new Map());

    document.title = "GEO论文资料库：生成式搜索、引用机制与AI可见度研究 | 天行GEO";
    elements.breadcrumbs.innerHTML = `
      <a href="./index.html">首页</a>
      <span>/</span>
      <a href="./columns/shitu-geo/index.html">GEO知识库</a>
      <span>/</span>
      <span>论文资料库</span>
    `;
    elements.head.innerHTML = `
      <p class="eyebrow">Research Library</p>
      <h1>GEO / SEO / AI Search 论文资料库</h1>
      <p>这里集中收录 ${papers.length} 份 GEO、SEO、AI Search、生成式搜索优化、引用机制和多模态场景相关论文资料。专题首页优先看文章，研究依据在这里按主题查阅。</p>
    `;
    elements.actions.innerHTML = `
      <a class="button primary" href="./columns/shitu-geo/index.html">返回 GEO知识库</a>
    `;
    elements.facts.innerHTML = [...groups.entries()]
      .map(
        ([group, items]) => `
          <section class="research-library-group">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Papers</p>
                <h2>${escapeHtml(group)}</h2>
              </div>
              <p>${items.length} 份</p>
            </div>
            <div class="resource-grid">
              ${items
                .map(
                  (paper) => `
                    <article class="resource-card">
                      <div class="resource-meta-line">
                        <span class="resource-badge">${escapeHtml(paper.badge || "论文资料")}</span>
                        <span class="resource-subtitle">${escapeHtml(paper.subtitle || "")}</span>
                      </div>
                      <h3>${escapeHtml(paper.title)}</h3>
                      <p>${escapeHtml(paper.summary || "")}</p>
                      <div class="resource-actions">
                        <a class="button primary" href="./research.html?slug=${encodeURIComponent(paper.slug)}">在线查看</a>
                        <a class="button secondary" href="./${paper.downloadUrl}" download>下载 PDF</a>
                      </div>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>
        `
      )
      .join("");
    setViewerVisible(false);
  }

  function renderNotFound() {
    document.title = "论文资料未找到 | 天行GEO";
    elements.breadcrumbs.innerHTML = `
      <a href="./index.html">首页</a>
      <span>/</span>
      <a href="./columns/shitu-geo/index.html">GEO知识库</a>
      <span>/</span>
      <span>论文资料</span>
    `;
    elements.head.innerHTML = `
      <p class="eyebrow">Research</p>
      <h1>没有找到这份论文资料</h1>
      <p>请返回 GEO专题中的论文资料库重新选择。</p>
    `;
    elements.actions.innerHTML = `<a class="button primary" href="./research.html">返回论文资料库</a>`;
    elements.facts.innerHTML = "";
    setViewerVisible(false);
    if (elements.frame) {
      elements.frame.removeAttribute("src");
    }
  }

  function injectSchema(site, paper) {
    document.getElementById("research-schema")?.remove();
    const node = document.createElement("script");
    node.id = "research-schema";
    node.type = "application/ld+json";
    node.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "DigitalDocument",
      name: paper.title,
      description: paper.summary,
      url: `${site.baseUrl || ""}/research.html?slug=${paper.slug}`,
      encodingFormat: "application/pdf",
      inLanguage: "zh-CN",
      isPartOf: {
        "@type": "WebSite",
        name: site.name || "天行GEO",
        url: site.baseUrl || ""
      }
    });
    document.head.appendChild(node);
  }

  function init() {
    if (!getSlug()) {
      renderLibrary();
      return;
    }

    const paper = getPaper();
    const site = SiteDataService.getSite();

    if (!paper) {
      renderNotFound();
      return;
    }

    document.title = `${paper.title} | GEO论文资料`;
    elements.breadcrumbs.innerHTML = `
      <a href="./index.html">首页</a>
      <span>/</span>
      <a href="./columns/shitu-geo/index.html">GEO知识库</a>
      <span>/</span>
      <span>${escapeHtml(paper.title)}</span>
    `;

    elements.head.innerHTML = `
      <p class="eyebrow">Research</p>
      <h1>${escapeHtml(paper.title)}</h1>
      <p>${escapeHtml(paper.summary)}</p>
    `;

    elements.actions.innerHTML = `
      <a class="button primary" href="./${paper.downloadUrl}" download>下载 PDF</a>
      ${paper.sourceUrl ? `<a class="button secondary" href="${escapeHtml(paper.sourceUrl)}" target="_blank" rel="noreferrer">原始来源</a>` : ""}
      <a class="button secondary" href="./research.html">返回论文资料库</a>
    `;

    elements.facts.innerHTML = `
      <div class="research-meta-chip">${icon("article")}<span>${escapeHtml(paper.subtitle)}</span></div>
      <div class="research-meta-chip">${icon("tag")}<span>${escapeHtml(paper.badge)}</span></div>
      ${(paper.highlights || [])
        .map(
          (item) => `
            <div class="research-meta-chip research-meta-chip-wide">${icon("chevronRight")}<span>${escapeHtml(item)}</span></div>
          `
        )
        .join("")}
    `;

    if (elements.frame) {
      elements.frame.src = `./${paper.viewUrl}`;
    }
    setViewerVisible(true);

    injectSchema(site, paper);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
