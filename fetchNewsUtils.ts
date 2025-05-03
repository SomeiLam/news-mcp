import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import iso6391 from "iso-639-1";
import { z } from "zod";

import dotenv from 'dotenv';
dotenv.config();

countries.registerLocale(enLocale);
export type Category =
  | "business"
  | "entertainment"
  | "general"
  | "health"
  | "science"
  | "sports"
  | "technology";

export const Categories = [
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology",
] as const;

// A single country code validator + Zod description
export const CountryCode = z
  .string()
  .describe("2‑letter ISO‑3166 country code or full country name")
  .transform((s) => s.trim())
  .refine(
    (raw) =>
      raw.length === 2 || // we’ll normalize it in code
      Boolean(countries.getAlpha2Code(raw, "en")),
    { message: "Invalid country name or code" }
  )
  .transform((raw) => raw.length === 2 ? raw.toLowerCase() : countries.getAlpha2Code(raw, "en")!.toLowerCase());

export const LanguageCode = z
  .string()
  .describe("2‑letter ISO‑639‑1 language code or full name")
  .transform((s) => s.trim())
  .refine(
    (raw) => iso6391.validate(raw.toLowerCase()) || Boolean(iso6391.getCode(raw)),
    { message: "Invalid language name or code" }
  )
  .transform((raw) =>
    iso6391.validate(raw.toLowerCase())
      ? raw.toLowerCase()
      : iso6391.getCode(raw)!.toLowerCase()
  );

export const CategoryEnum = z
  .enum(Categories)
  .describe(
    "Optional category filter: business, entertainment, general, health, science, sports, technology"
  );

// — normalize user’s country inputs into ISO‑2 lowercase
export const normalizeCountries = (inputs: string[]): string[] => {
  return inputs.map((v) => {
    const up = v.trim().toUpperCase();
    const code = countries.isValid(up)
      ? up
      : countries.getAlpha2Code(v.trim(), "en");
    if (!code) throw new Error(`Unrecognized country: "${v}"`);
    return code.toLowerCase();
  });
}

// — normalize user’s language inputs into ISO‑639‑1 lowercase
export const normalizeLanguages = (inputs: string[]): string[] => {
  return inputs.map((v) => {
    const raw = v.trim();
    // either it’s already a code…
    if (iso6391.validate(raw.toLowerCase())) {
      return raw.toLowerCase();
    }
    // or try to lookup by name
    const code = iso6391.getCode(raw);
    if (!code) throw new Error(`Unrecognized language: "${v}"`);
    return code.toLowerCase();
  });
}

export const normalizeKeywords = (
  kws: string | string[]
): string => {
  if (Array.isArray(kws)) {
    return kws.map((w) => w.trim()).filter(Boolean).join(" OR ");
  }
  return kws.trim();
}


export interface FetchNewsOptions {
  countryCodes?: string[];
  category?: Category;
  languageCodes?: string[];
  keywords?: string | string[];
  from?: string;
  to?: string;
  sortBy?: SortBy;
  pageSize?: number;
}

/**
 * Fetch top‐headlines by country (using /v2/top-headlines)
 * and/or “everything” by language (using /v2/everything).
 */
export type SortBy = "relevancy" | "popularity" | "publishedAt";

export const fetchNews = async (
  countryCodes: string[] = [],
  category?: Category,
  languageCodes: string[] = [],
  keywords?: string | string[],
  from?: string,
  to?: string,
  sortBy?: SortBy,
  pageSize: number = 10
) => {
  const results: any[] = [];

  // 1) top‑headlines per country
  if (countryCodes.length) {
    await Promise.all(
      countryCodes.map(async (cc) => {
        const url = new URL("https://newsapi.org/v2/top-headlines");
        url.searchParams.set("country", cc);
        if (category) url.searchParams.set("category", category);
        url.searchParams.set("pageSize", String(pageSize));
        url.searchParams.set("apiKey", process.env.NEWSAPI_KEY!);

        const resp = await fetch(url.toString());
        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`NewsAPI error ${resp.status}: ${err}`);
        }
        const { articles } = await resp.json();
        results.push({ country: cc, category: category ?? undefined, articles });
      })
    );
  }

  // 2) everything per language with optional keywords, date, sort
  if (languageCodes.length || keywords) {
    const q = keywords ? normalizeKeywords(keywords) : undefined;

    await Promise.all(
      (languageCodes.length ? languageCodes : [undefined]).map(async (lang) => {
        const url = new URL("https://newsapi.org/v2/everything");
        if (lang) url.searchParams.set("language", lang);
        if (q) url.searchParams.set("q", q);
        if (from) url.searchParams.set("from", from);
        if (to) url.searchParams.set("to", to);
        if (sortBy) url.searchParams.set("sortBy", sortBy);
        url.searchParams.set("pageSize", String(pageSize));
        url.searchParams.set("apiKey", process.env.NEWSAPI_KEY!);

        const resp = await fetch(url.toString());
        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`NewsAPI error ${resp.status}: ${err}`);
        }
        const { articles } = await resp.json();
        results.push({
          language: lang,
          keywords: q,
          from,
          to,
          sortBy,
          articles,
        });
      })
    );
  }

  return results;
}

const ArticleSchema = z.object({
  source: z.object({ id: z.string().nullable(), name: z.string() }),
  author: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string().url(),
  urlToImage: z.string().nullable(),
  publishedAt: z.string(),  // ISO timestamp
  content: z.string().nullable(),
});

export const NewsChunkSchema = z.object({
  country: z.string().optional(),
  language: z.string().optional(),
  category: z.string().nullable().optional(),
  articles: z.array(ArticleSchema),
});


export const generateMarkdown = async (
  newsByCountry: any
) => {
  const systemPrompt = `
You are a news‐digest bot. Given JSON of top headlines grouped by country, produce a clean Markdown document.
- For each country, render a “## Country Name” heading.
- Under each, list bullet points: **[Title](URL)** – short description (source name).
- Keep it concise, reader-friendly, with a one-sentence intro and a one-sentence outro.
`;
  const userPrompt = `
Here’s the data:
\`\`\`json
${JSON.stringify(newsByCountry, null, 2)}
\`\`\`
  
Format accordingly.
`;

  const resp = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GEMINI_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5",
        messages: [
          { role: 'system', content: systemPrompt.trim()  },
          { role: 'user',   content: userPrompt.trim()    },
        ],
        temperature: 0.7,
      }),
    }
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${err}`);
  }
  const { choices } = await resp.json();
  return choices[0].message.content as string;
}
