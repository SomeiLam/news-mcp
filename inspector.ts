import readline from "readline";

const MCP_URL = process.env.MCP_URL ?? "http://localhost:3000/mcp";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(q: string): Promise<string> {
  return new Promise((res) => rl.question(q, res));
}

async function callTool(tool: string, args: any) {
  const resp = await fetch(MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, arguments: args }),
  });
  if (!resp.ok) {
    console.error(`→ HTTP ${resp.status}:`, await resp.text());
    return;
  }
  const body = await resp.json();
  console.log("→ Response:\n", JSON.stringify(body, null, 2));
}

(async () => {
  console.log("📡 MCP Inspector Type your tool name (or ENTER to quit), then JSON args.\n");
  while (true) {
    const tool = (await question("Tool name> ")).trim();
    if (!tool) break;
    const raw = await question("Arguments JSON> ");
    let args: any;
    try {
      args = JSON.parse(raw);
    } catch {
      console.error("✖ Invalid JSON. Try again.");
      continue;
    }
    await callTool(tool, args);
    console.log();
  }
  rl.close();
})();