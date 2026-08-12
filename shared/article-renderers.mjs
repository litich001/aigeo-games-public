import {
  createArticleUrl,
  escapeHtml,
  formatDate,
  renderMarkdown,
  sortArticles
} from "./content-utils.mjs";

export function findRelatedArticles(allArticles = [], article) {
  const relatedFromConfig = (article.relatedSlugs || [])
    .map((slug) => allArticles.find((item) => item.slug === slug))
    .filter(Boolean);

  const sameChannel = allArticles.filter(
    (item) => item.slug !== article.slug && item.channel === article.channel
  );

  return [...new Map([...relatedFromConfig, ...sameChannel].map((item) => [item.slug, item])).values()].slice(
    0,
    4
  );
}

export function renderArticleHero(article, basePath = "./") {
  const heroImage = article.heroImage?.src
    ? `
      <figure class="article-cover">
        <img src="${escapeHtml(article.heroImage.src)}" alt="${escapeHtml(
          article.heroImage.alt || article.title
        )}" />
      </figure>
    `
    : "";

  return `
    <div class="article-hero-grid">
      <div class="article-hero-copy">
        <div class="article-breadcrumbs">
          <a href="${escapeHtml(`${basePath}index.html`)}">首页</a>
          <span>/</span>
          <span>${escapeHtml(article.channel)}</span>
          <span>/</span>
          <span>${escapeHtml(article.topic)}</span>
        </div>
        <span class="channel-chip" style="--chip-accent:${escapeHtml(article.accent || "#2563eb")}">
          ${escapeHtml(article.channel)}
        </span>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
        <div class="article-meta">
          <span>${escapeHtml(article.author)}</span>
          <span>${formatDate(article.publishedAt)}</span>
          <span>${escapeHtml(article.readTime)}</span>
          <span>${escapeHtml(article.topic)}</span>
        </div>
        <div class="article-tags">
          ${(article.tags || [])
            .map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`)
            .join("")}
        </div>
      </div>
      <div class="article-hero-side">
        ${heroImage}
        <div class="takeaway-card">
          <p class="eyebrow">重点提要</p>
          <ul>
            ${(article.takeaways || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </div>
  `;
}

export function renderArticleBody(article) {
  const rendered = renderMarkdown(article.markdown || "");
  return {
    toc: rendered.toc,
    html: `
      <div class="article-body">
        ${rendered.html}
      </div>
    `
  };
}

export function renderArticleSidebar(article, allArticles = [], basePath = "./") {
  const sorted = sortArticles(allArticles);
  const index = sorted.findIndex((item) => item.slug === article.slug);
  const newer = index > 0 ? sorted[index - 1] : null;
  const older = index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null;
  const related = findRelatedArticles(allArticles, article);
  const { toc } = renderArticleBody(article);

  return `
    <div class="sidebar-block">
      <h3>文章目录</h3>
      <ol class="toc-list">
        ${toc
          .map(
            (item) => `
              <li class="toc-level-${item.level}">
                <a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a>
              </li>
            `
          )
          .join("")}
      </ol>
    </div>

    <div class="sidebar-block">
      <h3>文章操作</h3>
      <div class="sidebar-actions">
        <a class="button secondary compact" href="${escapeHtml(`${basePath}index.html`)}">返回首页</a>
        <button class="button secondary compact" type="button" id="copy-link-button">复制链接</button>
        <button class="button primary compact" type="button" id="open-editor-button">前端改稿</button>
      </div>
    </div>

    <div class="sidebar-block">
      <h3>相关文章</h3>
      <ul class="related-list">
        ${related
          .map(
            (item) => `
              <li>
                <a href="${createArticleUrl(basePath, item.slug)}">${escapeHtml(item.title)}</a>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>

    <div class="sidebar-block">
      <h3>上下篇导航</h3>
      <div class="article-pager">
        ${
          newer
            ? `
              <a class="pager-card" href="${createArticleUrl(basePath, newer.slug)}">
                <span>更新的一篇</span>
                <strong>${escapeHtml(newer.title)}</strong>
              </a>
            `
            : ""
        }
        ${
          older
            ? `
              <a class="pager-card" href="${createArticleUrl(basePath, older.slug)}">
                <span>更早的一篇</span>
                <strong>${escapeHtml(older.title)}</strong>
              </a>
            `
            : ""
        }
      </div>
    </div>
  `;
}

export function renderArticleStructuredData(site, article, baseUrl) {
  const normalizedBase = (baseUrl || site.baseUrl || "").replace(/\/$/, "");
  const url = normalizedBase ? `${normalizedBase}/articles/${article.slug}/` : "";
  const image = article.heroImage?.src || site.defaultSocialImage || "";

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.seo?.title || article.title,
    description: article.seo?.description || article.excerpt,
    image: image ? [image] : undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      "@type": "Organization",
      name: article.author
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      logo: image
        ? {
            "@type": "ImageObject",
            url: image
          }
        : undefined
    },
    mainEntityOfPage: url || undefined
  };
}
