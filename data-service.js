(function () {
  const content = window.NEWS_SITE_DATA || { site: {}, columns: [], articles: [], publish: {} };
  const STORAGE_KEY = "aigeo-content-site-overrides";
  const { sortArticles, stripMarkdown } = window.ContentUtils;
  let protectedArticles = [];
  const columnArticles = new Map();
  const columnLoads = new Map();

  function getColumnPartCount(slug) {
    const column = (content.columns || []).find((item) => item.slug === slug);
    return Math.ceil((Number(column?.articleCount) || 0) / 100);
  }

  function consumeColumn(slug) {
    const parts = [];
    for (let part = 1; part <= getColumnPartCount(slug); part += 1) {
      const articles = window.NEWS_SITE_COLUMN_DATA?.[`${slug}:${part}`];
      if (!Array.isArray(articles)) {
        return false;
      }
      parts.push(...articles);
    }
    columnArticles.set(slug, parts);
    return true;
  }

  function loadColumnPart(slug, part) {
    const shardKey = `${slug}:${part}`;
    if (Array.isArray(window.NEWS_SITE_COLUMN_DATA?.[shardKey])) {
      return Promise.resolve();
    }
    if (columnLoads.has(shardKey)) {
      return columnLoads.get(shardKey);
    }
    const basePath = document.body?.dataset?.basePath || "./";
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${basePath}data/content-index/${encodeURIComponent(slug)}-${part}.js`;
      script.async = true;
      script.onload = () => (Array.isArray(window.NEWS_SITE_COLUMN_DATA?.[shardKey]) ? resolve() : reject(new Error(`Invalid content index shard ${shardKey}`)));
      script.onerror = () => reject(new Error(`Unable to load content index shard ${shardKey}`));
      document.head.appendChild(script);
    }).catch((error) => {
      columnLoads.delete(shardKey);
      throw error;
    });
    columnLoads.set(shardKey, promise);
    return promise;
  }

  function canUseStorage() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  }

  function readOverrides() {
    if (!canUseStorage()) {
      return {};
    }

    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (error) {
      console.warn("Failed to read overrides.", error);
      return {};
    }
  }

  function writeOverrides(overrides) {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }

  function withOverrides(articles) {
    const overrides = readOverrides();
    return (articles || []).map((article) => ({
      ...article,
      ...(overrides[article.slug] || {})
    }));
  }

  function filterArticles(articles, options) {
    const category = options?.category || "";
    const year = options?.year || "";
    const date = options?.date || "";
    const query = String(options?.query || "").trim().toLowerCase();

    return (articles || []).filter((article) => {
      if (date && article.publishedDate !== date) {
        return false;
      }

      if (category && article.categorySlug !== category) {
        return false;
      }

      if (year && String(article.year) !== String(year)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        article.title,
        article.excerpt,
        article.category,
        article.columnName,
        article.industry,
        stripMarkdown(article.markdown || "").slice(0, 500)
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }

  window.SiteDataService = {
    getSite() {
      return content.site || {};
    },

    getPublishConfig() {
      return content.publish || {};
    },

    getColumns() {
      return (content.columns || []).map((column) => ({
        ...column,
        articleCount: Number(column.articleCount) || this.getArticlesByColumn(column.slug).length
      }));
    },

    getColumnBySlug(slug) {
      return this.getColumns().find((column) => column.slug === slug) || null;
    },

    getArticles() {
      const protectedBySlug = new Map(protectedArticles.map((article) => [article.slug, article]));
      const indexedBySlug = new Map((content.articles || []).map((article) => [article.slug, article]));
      for (const articles of columnArticles.values()) {
        for (const article of articles) {
          indexedBySlug.set(article.slug, article);
        }
      }
      const merged = [...indexedBySlug.values()].map((article) => protectedBySlug.get(article.slug) || article);
      for (const article of protectedArticles) {
        if (!indexedBySlug.has(article.slug)) {
          merged.push(article);
        }
      }
      return sortArticles(withOverrides(merged));
    },

    setProtectedArticles(articles) {
      protectedArticles = Array.isArray(articles) ? articles.filter(Boolean) : [];
    },

    clearProtectedArticles() {
      protectedArticles = [];
    },

    async loadColumn(slug) {
      if (!slug || !(content.columns || []).some((column) => column.slug === slug)) {
        return false;
      }
      await Promise.all(Array.from({ length: getColumnPartCount(slug) }, (_, index) => loadColumnPart(slug, index + 1)));
      if (!consumeColumn(slug)) {
        throw new Error(`Incomplete content index for ${slug}`);
      }
      return true;
    },

    async loadAllColumns() {
      await Promise.all((content.columns || []).map((column) => this.loadColumn(column.slug)));
    },

    getArticleBySlug(slug) {
      return this.getArticles().find((article) => article.slug === slug) || null;
    },

    getArticlesByColumn(columnSlug) {
      return this.getArticles().filter((article) => article.columnSlug === columnSlug);
    },

    getColumnDates(columnSlug) {
      const counts = new Map();
      this.getArticlesByColumn(columnSlug).forEach((article) => {
        const key = article.publishedDate;
        counts.set(key, {
          value: key,
          label: article.publishedDateLabel || article.publishedDate,
          count: (counts.get(key)?.count || 0) + 1
        });
      });

      return [...counts.values()].sort((a, b) => b.value.localeCompare(a.value, "zh-CN", { sensitivity: "base" }));
    },

    getColumnCategories(columnSlug) {
      const counts = new Map();
      this.getArticlesByColumn(columnSlug).forEach((article) => {
        const key = article.categorySlug;
        counts.set(key, {
          slug: key,
          name: article.category,
          count: (counts.get(key)?.count || 0) + 1
        });
      });

      return [...counts.values()].sort((a, b) => a.slug.localeCompare(b.slug, "zh-CN", { sensitivity: "base" }));
    },

    getColumnYears(columnSlug) {
      const counts = new Map();
      this.getArticlesByColumn(columnSlug).forEach((article) => {
        const key = String(article.year || "");
        counts.set(key, {
          value: key,
          count: (counts.get(key)?.count || 0) + 1
        });
      });

      return [...counts.values()].sort((a, b) => Number(b.value) - Number(a.value));
    },

    getColumnPage(columnSlug, options) {
      const pageSize = Number(options?.pageSize || 10);
      const page = Math.max(1, Number(options?.page || 1));
      const filtered = filterArticles(this.getArticlesByColumn(columnSlug), options);
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      const currentPage = Math.min(page, totalPages);
      const start = (currentPage - 1) * pageSize;

      return {
        items: filtered.slice(start, start + pageSize),
        totalItems: filtered.length,
        totalPages,
        currentPage
      };
    },

    getRecentArticles(limit) {
      return this.getArticles().slice(0, limit || 6);
    },

    async searchAll(query, limit) {
      const normalized = String(query || "").trim().toLowerCase();
      if (!normalized) {
        return { columns: [], articles: [] };
      }

      await this.loadAllColumns();

      const columns = this.getColumns()
        .filter((column) => [column.name, column.industry, column.company, column.description].join(" ").toLowerCase().includes(normalized))
        .slice(0, 8);

      const articles = filterArticles(this.getArticles(), { query: normalized }).slice(0, limit || 12);

      return { columns, articles };
    },

    saveArticleOverride(slug, patch) {
      const overrides = readOverrides();
      overrides[slug] = {
        ...(overrides[slug] || {}),
        ...patch
      };
      writeOverrides(overrides);
    },

    clearArticleOverride(slug) {
      const overrides = readOverrides();
      delete overrides[slug];
      writeOverrides(overrides);
    }
  };
})();
