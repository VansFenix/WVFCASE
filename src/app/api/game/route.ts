import { AppError, checkOrigin, ensurePlayer, errorResponse, rateLimit } from "@/lib/auth";
import { getGameState, performAction } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET() {
  try { const user = await ensurePlayer(); return Response.json(await getGameState(user.id)); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await ensurePlayer();
    rateLimit(`game:${user.id}`, 100);
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new AppError("Некорректный запрос.");
    return Response.json(await performAction(user.id, input));
  } catch (error) { return errorResponse(error); }
}
