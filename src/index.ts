import { Hono } from "hono";
import { politicianHandlers } from "./features/politician/handlers";
import { syncHandlers } from "./features/sync/handlers";
import { discoverNewFilings } from "./features/sync/discovery";
import { QueueMessage } from "./features/sync/types";
import { processPdfMessage } from "./features/sync/processor";
import { tradeHandlers } from "./features/trade/handlers";

const app = new Hono<{ Bindings: Env }>();

type Bindings = {
  DB: D1Database;
  PDF_QUEUE: Queue<QueueMessage>;
  ENV: string;
};

app.get("/", (c) => c.json({ ok: true }));
app.route("/politicians", politicianHandlers);
app.route('/trades', tradeHandlers);
app.route("/sync", syncHandlers);

export default {
  fetch: app.fetch,

  // Cron: 4 veces al día
  async scheduled(
    controller: ScheduledController,
    env: Bindings,
    ctx: ExecutionContext,
  ): Promise<void> {
    console.log(`[cron] disparado: ${controller.cron}`);
    ctx.waitUntil(discoverNewFilings(env));
  },

  // Queue consumer
  async queue(
    batch: MessageBatch<QueueMessage>,
    env: Bindings,
    _ctx: ExecutionContext,
  ): Promise<void> {
    for (const msg of batch.messages) {
      try {
        const result = await processPdfMessage(msg.body, env);
        console.log(
          `[queue] processed ${msg.body.filingId}: ${result.tradesInserted} trades`,
        );
        msg.ack();
      } catch (err) {
        console.error(`[queue] failed ${msg.body.filingId}:`, err);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Bindings, QueueMessage>;
