import { Hono } from "hono";
import { getTradesByPolitician } from "./queries";
import { parsePagination } from "../../lib/paginations/parse";
import { badRequest } from "../../lib/http/errors";
import { ok } from "../../lib/http/respond";

export const tradeHandlers = new Hono<{ Bindings: Env }>();

tradeHandlers.get("/", async (c) => {
  const politicianId = c.req.query("politicianId");
  if (!politicianId) throw badRequest('Query param "politicianId" is required');

  const params = parsePagination(c);
  const result = await getTradesByPolitician(c.env, politicianId, params);
  return ok(c, { items: result.data, pagination: result.pagination });
});
