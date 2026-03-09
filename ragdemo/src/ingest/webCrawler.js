import * as cheerio from "cheerio";

const normalizeUrl = (value) => {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    return parsed.toString();
  } catch (_error) {
    return null;
  }
};

const sameOrigin = (left, right) => {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch (_error) {
    return false;
  }
};

const extractPage = (url, html) => {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg,header,footer,nav").remove();

  const title = ($("title").first().text() || "Untitled").trim();
  const text = $("main").text() || $("article").text() || $("body").text();

  const links = [];
  $("a[href]").each((_idx, node) => {
    const href = $(node).attr("href");
    if (!href) return;

    try {
      const absolute = new URL(href, url).toString();
      links.push(absolute);
    } catch (_error) {
      // Skip invalid links.
    }
  });

  return {
    text: text.replace(/\s+/g, " ").trim(),
    title,
    links
  };
};

export const crawlHelpDocs = async ({
  seedUrls,
  maxDepth,
  maxPages
}) => {
  const queue = seedUrls
    .map((url) => ({ url: normalizeUrl(url), depth: 0 }))
    .filter((item) => item.url);

  const visited = new Set();
  const pages = [];

  while (queue.length && pages.length < maxPages) {
    const current = queue.shift();
    if (!current || visited.has(current.url)) {
      continue;
    }

    visited.add(current.url);

    try {
      const response = await fetch(current.url);
      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        continue;
      }

      const html = await response.text();
      const page = extractPage(current.url, html);

      if (page.text) {
        pages.push({
          url: current.url,
          title: page.title,
          text: page.text
        });
      }

      if (current.depth >= maxDepth) {
        continue;
      }

      for (const link of page.links) {
        const normalized = normalizeUrl(link);
        if (!normalized || visited.has(normalized)) {
          continue;
        }

        if (!sameOrigin(current.url, normalized)) {
          continue;
        }

        queue.push({ url: normalized, depth: current.depth + 1 });
      }
    } catch (_error) {
      // Skip unreachable pages and continue crawl.
    }
  }

  return pages;
};
