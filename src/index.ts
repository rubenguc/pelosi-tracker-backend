import { Hono } from "hono";
import { politicianHandlers } from "./features/politician/handlers";
import { syncHandlers } from "./features/sync/handlers";
import { discoverNewFilings } from "./features/sync/discovery";
import { QueueMessage } from "./features/sync/types";
import { processPdfMessage } from "./features/sync/processor";
import { tradeHandlers } from "./features/trade/handlers";
import { createLogger } from "./lib/logger";
import { setupErrorHandling } from "./lib/http/setup";

const app = new Hono<{ Bindings: Env }>();

setupErrorHandling(app);

app.get("/", (c) => c.json({ ok: true }));
app.route("/politicians", politicianHandlers);
app.route("/trades", tradeHandlers);
app.route("/sync", syncHandlers);

export default {
  fetch: app.fetch,

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const log = createLogger(env);
    log.info({ cron: controller.cron }, "cron triggered");
    ctx.waitUntil(
      discoverNewFilings(env).catch((err) => {
        log.error({ err }, "discovery failed");
      }),
    );
  },

  async queue(batch, env) {
    const log = createLogger(env);
    log.info({ count: batch.messages.length }, "queue batch received");
    for (const msg of batch.messages) {
      try {
        const r = await processPdfMessage(msg.body, env);
        log.info(
          { filingId: msg.body.filingId, trades: r.tradesInserted },
          "processed",
        );
        msg.ack();
      } catch (err) {
        log.error({ err, filingId: msg.body.filingId }, "failed");
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env, QueueMessage>;
