import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  generateMarkdown,
  normalizeCountries,
  normalizeLanguages,
  fetchNews,
  CountryCode,
  LanguageCode,
  CategoryEnum,
  normalizeKeywords,
} from "./utils";
import dotenv from 'dotenv';
dotenv.config();

const server = new McpServer({
  name: "NewsDigest MCP",
  version: "1.0.0",
});

declare const Buffer

// Tool #1: fetch headlines
server.tool(
  "get-news-digest",
  {
    // union of all fetch params:
    countries: z.array(CountryCode).optional(),
    languages: z.array(LanguageCode).optional(),
    category: CategoryEnum.optional(),
    keywords: z.union([z.string(), z.array(z.string())]).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    sortBy: z.enum(["relevancy","popularity","publishedAt"]).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  },
  {
    title: "Get News Digest",
    description:
      "Fetches news (by country/language/category or by keywords) and returns a ready-to-render Markdown digest.",
    idempotentHint: true,
  },
  async (args) => {
    // 1) normalize & fetch
    const cc = args.countries ? normalizeCountries(args.countries) : [];
    const lc = args.languages ? normalizeLanguages(args.languages) : [];
    const news = await fetchNews(cc, args.category, lc, args.keywords);

    // 2) format
    const md = await generateMarkdown(news);

    // 3) return Markdown directly
    return {
      content: [
        {
          type: "resource" as const,
          resource: {
            text: md,
            uri: 'data:text/markdown;base64,' + Buffer.from(md).toString('base64'),
            mimeType: 'text/markdown',
          },
        },
      ],
    };
  }
);

// Tool #2: summarize & format
server.tool(
  'format-news-markdown',
  { newsData: z.any() },
  async ({ newsData }) => {
    const md = await generateMarkdown(newsData);
    return {
      content: [
        {
          type: "resource",
          resource: {
            text: md,
            uri: 'data:text/markdown;base64,' + Buffer.from(md).toString('base64'),
            mimeType: 'text/markdown',
          },
        },
      ],
    };
  }
);

// Tool #3: search by keywords
server.tool(
  "search-everything",
  {
    keywords: z
      .union([z.string().min(1), z.array(z.string().min(1))])
      .describe(
        "One or more search terms (string or array). Multiple terms will be OR‑joined."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "Optional 2‑letter ISO‑639‑1 code to filter articles by language (e.g. 'en', 'jp')."
      ),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
      .optional()
      .describe("Optional start date for the time window (inclusive)"),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
      .optional()
      .describe("Optional end date for the time window (inclusive)"),
    sortBy: z
      .enum(["relevancy", "popularity", "publishedAt"] as const)
      .optional()
      .describe("How to sort results: relevancy, popularity, or publishedAt"),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Number of results to return (1–100)"),
  },
  {
    // ---- annotations object (second overload) ----
    title: "Search News by Keywords",
    description:
      "Use this tool when the user asks to search news by arbitrary keywords (e.g. “What’s happening with AI?”).",
    openWorldHint: true,
  },
  async ({ keywords, language, from, to, sortBy, pageSize }) => {
    const q = normalizeKeywords(keywords);
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", q);
    if (language) url.searchParams.set("language", language.toLowerCase());
    if (from) url.searchParams.set("from", from);
    if (to) url.searchParams.set("to", to);
    if (sortBy) url.searchParams.set("sortBy", sortBy);
    url.searchParams.set("pageSize", String(pageSize ?? 10));
    url.searchParams.set("apiKey", process.env.NEWSAPI_KEY!);

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`NewsAPI error ${resp.status}: ${err}`);
    }
    const { articles } = await resp.json();

    // wrap as a resource so MCP accepts the JSON
    const text = JSON.stringify(articles, null, 2);
    return {
      content: [
        {
          type: "resource" as const,
          resource: {
            text,
            uri:
              "data:application/json;base64," +
              Buffer.from(text).toString("base64"),
            mimeType: "application/json",
          },
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);