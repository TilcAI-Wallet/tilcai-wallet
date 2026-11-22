import { setDemoPaid } from "@/lib/wallet";

// Solo demo: pasa la tarjeta simulada de "antes" a "después" del pago (`pay`) o la reinicia (`reset`).
export async function POST(_request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "pay" && action !== "reset") return Response.json({ error: "not_found" }, { status: 404 });
  setDemoPaid(action === "pay");
  return Response.json({ paid: action === "pay" });
}
