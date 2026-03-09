import fs from "node:fs/promises";
import * as cheerio from "cheerio";

export const parseHtml = async (filePath) => {
  const html = await fs.readFile(filePath, "utf8");
  const $ = cheerio.load(html);

  $("script,style,noscript").remove();

  const text = $("body").text() || $.text();
  return [{ text, metadata: {} }];
};
