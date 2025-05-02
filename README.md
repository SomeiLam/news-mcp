# NewsDigest MCP

A **Model Context Protocol (MCP)** server written in TypeScript that aggregates, searches, and formats news articles using the NewsAPI.org REST endpoints.

## Features

- **Fetch Top Headlines** by country (ISO‑2 code), language (ISO‑639‑1 code), and category (e.g., business, sports).
- **Search Everything** via full‑text queries (keywords) with optional filters: language, date range, sorting, page size.
- **Format to Markdown**: Convert raw JSON responses into a clean, reader‑friendly Markdown digest using an LLM (Gemini and Claude).

## Requirements

- **Node.js 18+** (for built‑in `fetch` support)
- **npm** or **yarn**
- **NewsAPI.org API key** (free tier available)
- **LLM API key** (Gemini and Claude)

## Installation

```
# Clone the repo
git clone https://github.com/yourusername/newsdigest-mcp.git
cd newsdigest-mcp

# Install dependencies
npm install
# or
# yarn install
```

## Configuration

Create a `.env` file in the project root:
```
# .env
NEWSAPI_KEY=<your_newsapi_key>
GEMINI_API_KEY=<your_gemini_key>   # for Google Gemini
ANTHROPIC_API_KEY=<your_claude_key>  # for Anthropic Claude
```

## Usage
Start the MCP server:
```
claude
```

Here are some example user queries and response:

Q: News about Bitcoin

A: Latest Bitcoin News (May 1, 2025)

1. El Salvador Committed to Buy Bitcoin Despite IMF Requirements
  - El Salvador's economy minister reaffirmed the country's commitment to accumulate more
Bitcoin despite IMF requirements to reduce exposure
  - The minister called it an "important project" started by President Nayib Bukele
2. North Carolina Passes Bill to Integrate Bitcoin Into $127 Billion Pension Fund
  - North Carolina House approved legislation allowing state pension fund to invest in
cryptocurrencies
  - The bill modernizes investment strategy for the state's $127 billion pension fund
3. US Could Buy $100 Billion in Bitcoin This Year, According to Coinbase Executive
  - Sebastian Bea, president of Coinbase Asset Management, suggests a technical change in
how Washington accounts for gold could enable a strategic Bitcoin purchase
  - The proposed purchase could approach $100 billion, years ahead of market expectations
4. North Carolina House Passes State Crypto Investment Bill
  - The Digital Assets Investment Act (House Bill 92) passed on its third reading
  - Bill allows the state treasurer to invest public funds in approved cryptocurrencies
  - Now moving to the Senate for consideration
5. Crypto Industry Event in Dubai as "Trump Euphoria" Shows Signs of Receding
  - Crypto enthusiasts gathered in Dubai for TOKEN2049 conference
  - Industry showing mixed sentiments about Donald Trump's impact on cryptocurrencies
  - Despite strong start to the year with significant venture capital investments
6. Malaysian Police Dismantle Bitcoin Mining Operation Stealing Electricity
  - Police in Terengganu, Malaysia dismantled a syndicate stealing electricity for illegal
bitcoin mining
  - Operations were discovered in Hulu Terengganu and Marang regions