import { handleMcp } from "@/lib/mcp";
import { commit, store } from "@/lib/wallet";

// Endpoint MCP remoto. El código de vinculación llega en la ruta (/api/mcp/<código>, para conectores sin cabeceras
// como los de ChatGPT o Claude en la web) o como `Authorization: Bearer <código>` (Claude Code, Codex).
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Mcp-Protocol-Version, Mcp-Session-Id",
  "Cache-Control": "no-store",
};

export async function POST(request: Request, { params }: { params: Promise<{ token?: string[] }> }) {
  const { token } = await params;
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const code = token?.[0] ?? bearer ?? null;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido." } }, { status: 400, headers });
  }
  const reply = handleMcp(store(), code, payload, new Date());
  commit();
  return reply.body === undefined ? new Response(null, { status: reply.status, headers }) : Response.json(reply.body, { status: reply.status, headers });
}

// Sin flujo de eventos del servidor: el cliente solo usa POST.
export const GET = () => new Response(null, { status: 405, headers: { ...headers, Allow: "POST, OPTIONS" } });
export const OPTIONS = () => new Response(null, { status: 204, headers });
