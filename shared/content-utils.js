(function () {
  const columnVisualMap = {
    "geo-special": { iconKey: "search", color: "#1d4ed8", softColor: "rgba(29, 78, 216, 0.12)" },
    "listed-company-committee": { iconKey: "building", color: "#4f46e5", softColor: "rgba(79, 70, 229, 0.12)" },
    "adult-education-upgrade": { iconKey: "graduation", color: "#0f766e", softColor: "rgba(15, 118, 110, 0.12)" },
    technology: { iconKey: "chip", color: "#0369a1", softColor: "rgba(3, 105, 161, 0.12)" },
    manufacturing: { iconKey: "factory", color: "#b45309", softColor: "rgba(180, 83, 9, 0.12)" },
    agriculture: { iconKey: "leaf", color: "#15803d", softColor: "rgba(21, 128, 61, 0.12)" },
    lifestyle: { iconKey: "spark", color: "#be185d", softColor: "rgba(190, 24, 93, 0.12)" },
    "home-living": { iconKey: "home", color: "#475569", softColor: "rgba(71, 85, 105, 0.12)" },
    beauty: { iconKey: "beauty", color: "#db2777", softColor: "rgba(219, 39, 119, 0.12)" },
    "mother-baby": { iconKey: "baby", color: "#7c3aed", softColor: "rgba(124, 58, 237, 0.12)" },
    food: { iconKey: "food", color: "#dc2626", softColor: "rgba(220, 38, 38, 0.12)" },
    coffee: { iconKey: "coffee", color: "#92400e", softColor: "rgba(146, 64, 14, 0.12)" },
    flowers: { iconKey: "flower", color: "#c026d3", softColor: "rgba(192, 38, 211, 0.12)" }
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(value));
  }

  function formatDateLong(value) {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(new Date(value));
  }

  function sortArticles(articles) {
    return [...(articles || [])].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }

  function stripMarkdown(markdown) {
    return String(markdown || "")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/^>\s?/gm, "")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/^\|(.+)\|$/gm, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function slugify(text) {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function resolveContentUrl(basePath, url) {
    const value = String(url || "").trim();
    if (!value || /^(https?:|data:|mailto:|tel:|#)/i.test(value)) {
      return value;
    }
    if (value.startsWith("/")) {
      return value;
    }
    return `${basePath || "./"}${value.replace(/^\.\//, "")}`;
  }

  function renderInline(text, basePath) {
    return escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_, label, href) => `<a href="${escapeHtml(resolveContentUrl(basePath, href))}" target="_blank" rel="noreferrer">${label}</a>`
      );
  }

  function parseTable(lines) {
    const rows = lines.map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim())
    );

    if (rows.length < 2) {
      return "";
    }

    const headers = rows[0];
    const body = rows.slice(2);

    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${headers.map((header) => `<th>${renderInline(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${body
              .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderMarkdown(markdown, basePath) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    const paragraph = [];
    const unordered = [];
    const ordered = [];
    const quote = [];
    const code = [];
    let inCode = false;

    function flushParagraph() {
      if (!paragraph.length) {
        return;
      }
      const text = paragraph.join(" ").trim();
      if (/^A\d*(?:[：:]|\s)/u.test(text)) {
        html.push(
          `<p class="qa-answer"><span class="qa-badge">A</span><span>${renderInline(
            text.replace(/^A\d*(?:[：:]|\s)\s*/u, ""),
            basePath
          )}</span></p>`
        );
      } else {
        html.push(`<p>${renderInline(text, basePath)}</p>`);
      }
      paragraph.length = 0;
    }

    function flushList() {
      if (unordered.length) {
        html.push(`<ul>${unordered.map((item) => `<li>${renderInline(item, basePath)}</li>`).join("")}</ul>`);
        unordered.length = 0;
      }

      if (ordered.length) {
        html.push(`<ol>${ordered.map((item) => `<li>${renderInline(item, basePath)}</li>`).join("")}</ol>`);
        ordered.length = 0;
      }
    }

    function flushQuote() {
      if (!quote.length) {
        return;
      }
      html.push(`<blockquote>${quote.map((item) => `<p>${renderInline(item, basePath)}</p>`).join("")}</blockquote>`);
      quote.length = 0;
    }

    function flushCode() {
      if (!code.length) {
        return;
      }
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      code.length = 0;
    }

    function flushAll() {
      flushParagraph();
      flushList();
      flushQuote();
    }

    for (let index = 0; index < lines.length; index += 1) {
      const raw = lines[index];
      const line = raw.trimEnd();

      if (line.startsWith("```")) {
        flushAll();
        if (inCode) {
          flushCode();
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        code.push(raw);
        continue;
      }

      if (!line.trim()) {
        flushAll();
        continue;
      }

      if (/^(\|.+\|)$/.test(line) && index + 1 < lines.length && /^\|?(\s*:?-+:?\s*\|)+\s*$/.test(lines[index + 1].trim())) {
        flushAll();
        const tableLines = [line, lines[index + 1].trim()];
        index += 2;
        while (index < lines.length && /^\|.+\|$/.test(lines[index].trim())) {
          tableLines.push(lines[index].trim());
          index += 1;
        }
        index -= 1;
        html.push(parseTable(tableLines));
        continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        flushAll();
        html.push("<hr />");
        continue;
      }

      const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        flushAll();
        const src = resolveContentUrl(basePath, imageMatch[2]);
        const isSvg = /\.svg(?:[?#].*)?$/i.test(src);
        const imageAttrs = isSvg
          ? 'width="1200" height="675" loading="eager" decoding="async"'
          : 'loading="lazy" decoding="async"';
        html.push(
          `<figure class="article-image"><img src="${escapeHtml(src)}" alt="${escapeHtml(
            imageMatch[1]
          )}" ${imageAttrs} /><figcaption>${escapeHtml(imageMatch[1] || "配图")}</figcaption></figure>`
        );
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushAll();
        const level = Math.min(6, headingMatch[1].length);
        const text = headingMatch[2].trim();
        if (level === 2 && /(q&a|faq|常见|甯歌)/iu.test(text)) {
          html.push(`<h2 class="qa-section-title" id="${escapeHtml(slugify("q-and-a"))}">Q&A</h2>`);
          continue;
        }
        if (level === 3 && /^Q\d*/u.test(text)) {
          const questionText = text.replace(/^Q\d*(?:[：:]|\s)\s*/u, "").trim();
          html.push(
            `<h3 class="qa-question" id="${escapeHtml(slugify(questionText))}"><span class="qa-badge">Q</span><span>${renderInline(
              questionText,
              basePath
            )}</span></h3>`
          );
          continue;
        }
        html.push(`<h${level} id="${escapeHtml(slugify(text))}">${renderInline(text, basePath)}</h${level}>`);
        continue;
      }

      const quoteMatch = line.match(/^>\s?(.+)$/);
      if (quoteMatch) {
        flushParagraph();
        flushList();
        quote.push(quoteMatch[1]);
        continue;
      }

      const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
      if (orderedMatch) {
        flushParagraph();
        if (unordered.length) {
          flushList();
        }
        ordered.push(orderedMatch[1]);
        continue;
      }

      const unorderedMatch = line.match(/^[-*+]\s+(.+)$/);
      if (unorderedMatch) {
        flushParagraph();
        if (ordered.length) {
          flushList();
        }
        unordered.push(unorderedMatch[1]);
        continue;
      }

      paragraph.push(line.trim());
    }

    flushAll();
    flushCode();

    return { html: html.join("\n") };
  }

  function icon(name, className = "icon") {
    const icons = {
      search:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.5 3a7.5 7.5 0 1 1 4.717 13.332l4.225 4.226-1.414 1.414-4.226-4.225A7.5 7.5 0 0 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11Z"/></svg>',
      folder:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l1.8 2H18.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"/></svg>',
      article:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 4v2h8V8H8Zm0 4v2h8v-2H8Zm0 4v2h5v-2H8Z"/></svg>',
      clock:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 1 0 20a10 10 0 0 1 0-20Zm1 5h-2v6l4 2l.9-1.8l-2.9-1.45V7Z"/></svg>',
      tag:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 11.5V6a2 2 0 0 1 2-2h5.5L20 12.5L12.5 20L4 11.5Zm4-4.5a1.5 1.5 0 1 0 .001 3.001A1.5 1.5 0 0 0 8 7Z"/></svg>',
      chevronLeft:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m14.7 5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-6.7-6.7 6.7-6.7Z"/></svg>',
      chevronRight:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m9.3 18.7-1.4-1.4 5.3-5.3-5.3-5.3 1.4-1.4 6.7 6.7-6.7 6.7Z"/></svg>',
      close:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"/></svg>',
      edit:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.3 3.3a1 1 0 0 1 1.4 0l2 2a1 1 0 0 1 0 1.4l-9.8 9.8-4.3.8.8-4.3 9.9-9.7ZM5 19h14v2H5z"/></svg>',
      grid:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"/></svg>',
      palette:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.477 3 2 6.806 2 11.5S5.925 20 10 20h1a2 2 0 1 0 0-4h-.5A1.5 1.5 0 0 1 9 14.5c0-.828.672-1.5 1.5-1.5H13c4.971 0 9-3.134 9-7s-4.477-7-10-7Zm-5 8a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3Zm4-4a1.5 1.5 0 1 1 .001 3.001A1.5 1.5 0 0 1 11 7Zm4 2a1.5 1.5 0 1 1 .001 3.001A1.5 1.5 0 0 1 15 9Zm4 0a1.5 1.5 0 1 1 .001 3.001A1.5 1.5 0 0 1 19 9Z"/></svg>',
      sun:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 1h2v4h-2V1Zm0 18h2v4h-2v-4ZM1 11h4v2H1v-2Zm18 0h4v2h-4v-2ZM4.22 5.64l1.42-1.42 2.83 2.83-1.42 1.42-2.83-2.83Zm11.31 11.31 1.42-1.42 2.83 2.83-1.42 1.42-2.83-2.83ZM4.22 18.36l2.83-2.83 1.42 1.42-2.83 2.83-1.42-1.42ZM15.53 7.05l2.83-2.83 1.42 1.42-2.83 2.83-1.42-1.42ZM12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10Z"/></svg>',
      moon:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.5 2.5a9 9 0 1 0 7 14.6a8 8 0 1 1-7-14.6Z"/></svg>',
      calendar:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h2V2Zm12 8H5v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9Z"/></svg>',
      building:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3h10a2 2 0 0 1 2 2v3h2a2 2 0 0 1 2 2v11H3V5a2 2 0 0 1 2-2Zm2 4v2h2V7H7Zm4 0v2h2V7h-2ZM7 11v2h2v-2H7Zm4 0v2h2v-2h-2Zm5 0v10h3V11h-3ZM9 21h2v-4h2v4h2v-6H9v6Z"/></svg>',
      graduation:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 1 8.5 12 14l8-4v5h2V8.5L12 3Zm-6 9.2V16c0 2.3 3 4 6 4s6-1.7 6-4v-3.8l-6 3-6-3Z"/></svg>',
      chip:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 3h6v2h2.5A2.5 2.5 0 0 1 20 7.5V10h2v4h-2v2.5A2.5 2.5 0 0 1 17.5 19H15v2H9v-2H6.5A2.5 2.5 0 0 1 4 16.5V14H2v-4h2V7.5A2.5 2.5 0 0 1 6.5 5H9V3Zm-1 4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H8Zm2 2h4v6h-4V9Z"/></svg>',
      factory:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 21V9.5L9 13V9.5l6 3.5V6l6 3.5V21H3Zm4-5h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z"/></svg>',
      leaf:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.5 3C11 3 5 8 5 14.5c0 3.75 2.75 6.5 6.5 6.5c6.5 0 11.5-6 11.5-14.5V3h-3.5ZM8 14c3.5-.5 6-2.5 8-6c-.5 4-2.5 6.5-6 8v5H8v-7Z"/></svg>',
      spark:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m13 2 1.5 5.5L20 9l-5.5 1.5L13 16l-1.5-5.5L6 9l5.5-1.5L13 2Zm-7 12 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Zm13 1 .75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15Z"/></svg>',
      home:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 3 10v11h6v-6h6v6h6V10l-9-7Z"/></svg>',
      beauty:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 3h6l1 4h2a2 2 0 0 1 2 2v11H6V9a2 2 0 0 1 2-2h2l1-4Zm2.3 2L8.8 7h4.4l-.5-2H9.3ZM12 10a3 3 0 1 0 0 6a3 3 0 0 0 0-6Z"/></svg>',
      baby:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4a2.5 2.5 0 1 1-2.1 3.86C5.93 8.72 3 12 3 15.75C3 19.2 6.58 22 12 22s9-2.8 9-6.25c0-3.75-2.93-7.03-6.9-7.89A2.5 2.5 0 0 1 12 4Zm-3 9.5A1.5 1.5 0 1 0 9 16.5a1.5 1.5 0 0 0 0-3Zm6 0A1.5 1.5 0 1 0 15 16.5a1.5 1.5 0 0 0 0-3ZM12 19c1.6 0 3-.68 3-1.5S13.6 16 12 16s-3 .68-3 1.5S10.4 19 12 19Z"/></svg>',
      food:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h2v9a3 3 0 0 1-2 2.82V22H5v-8.18A3 3 0 0 1 3 11V2h2v4h2V2Zm10 0c2.76 0 5 2.24 5 5v6h-3v9h-2v-9h-3V7c0-2.76 1.79-5 3-5Z"/></svg>',
      coffee:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 7h14v4h1a3 3 0 1 1 0 6h-1.4A6 6 0 0 1 12 21H8a6 6 0 0 1-6-6V7Zm14 6h1a1 1 0 1 0 0-2h-1v2Zm-8-9h2v2h-2V4Zm4 0h2v2h-2V4Z"/></svg>',
      flower:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c1.66 0 3 1.57 3 3.5c0 .55-.1 1.07-.28 1.55a3.8 3.8 0 0 1 4.78 3.7c0 1.93-1.34 3.5-3 3.5c-.4 0-.78-.09-1.14-.24c.09.32.14.66.14 1.01c0 1.93-1.57 3.5-3.5 3.5S8.5 16.95 8.5 15.02c0-.35.05-.69.14-1.01c-.36.15-.74.24-1.14.24c-1.66 0-3-1.57-3-3.5c0-1.86 1.25-3.38 2.84-3.64A3.74 3.74 0 0 1 7 5.5C7 3.57 8.34 2 10 2c.74 0 1.41.32 1.93.84A2.93 2.93 0 0 1 12 2Zm-.5 17.5h1V22h-1v-2.5Z"/></svg>'
    };

    return `<span class="${className}">${icons[name] || icons.article}</span>`;
  }

  function hashColumnValue(value) {
    return [...String(value || "aigeo")].reduce((sum, char) => sum + char.codePointAt(0), 0);
  }

  function buildFallbackVisual(column) {
    const hue = hashColumnValue(column.slug || column.name || "aigeo") % 360;
    return {
      iconKey: "grid",
      color: `hsl(${hue} 62% 42%)`,
      softColor: `hsl(${hue} 85% 94%)`
    };
  }

  function getColumnVisual(column) {
    const slug = column?.slug || column?.columnSlug || "";
    const mapped = columnVisualMap[slug] || columnVisualMap[column?.iconKey] || {};
    const fallback = buildFallbackVisual(column || {});

    return {
      iconKey: column?.iconKey || mapped.iconKey || fallback.iconKey,
      color: column?.color || mapped.color || fallback.color,
      softColor: column?.softColor || mapped.softColor || fallback.softColor
    };
  }

  function renderColumnIcon(column) {
    const visual = getColumnVisual(column);
    return `<span class="topic-icon-badge" style="--topic-color:${visual.color};--topic-soft:${visual.softColor};">${icon(
      visual.iconKey,
      "topic-icon-symbol"
    )}</span>`;
  }

  function createArticleUrl(basePath, slug) {
    return `${basePath || "./"}articles/${encodeURIComponent(slug || "")}/index.html`;
  }

  function createColumnUrl(basePath, slug) {
    return `${basePath || "./"}columns/${encodeURIComponent(slug || "")}/index.html`;
  }

  window.ContentUtils = {
    escapeHtml,
    formatDate,
    formatDateLong,
    sortArticles,
    stripMarkdown,
    slugify,
    renderMarkdown,
    resolveContentUrl,
    icon,
    getColumnVisual,
    renderColumnIcon,
    createArticleUrl,
    createColumnUrl
  };
})();
