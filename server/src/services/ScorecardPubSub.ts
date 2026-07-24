import IORedis from "ioredis";
import { connection as redis } from "../config/redisConnection";

/**
 * SCORECARD PUB/SUB
 *
 * Lightweight Redis Pub/Sub layer for scorecard state-change notifications.
 * Publishes on state changes (create, close, trigger, delete, manual exit)
 * so that socket handlers can react without MongoDB Change Streams.
 *
 * A dedicated subscriber connection is required because ioredis clients
 * in subscribe mode cannot issue normal commands.
 */

const CHANNEL = "scorecard:changes";

export interface ScorecardChangeEvent {
  type: "created" | "closed" | "triggered" | "deleted" | "manual_exit" | "modified";
  tradeId: string;
  authorId: string;
  planIds?: string[];
  marketplaceIds?: string[];
}

let subscriberClient: IORedis | null = null;
type ChangeHandler = (event: ScorecardChangeEvent) => void;
const handlers: Set<ChangeHandler> = new Set();

function getSubscriber(): IORedis {
  if (!subscriberClient) {
    subscriberClient = new IORedis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      family: 4,
    });

    subscriberClient.subscribe(CHANNEL, (err) => {
      if (err) console.error("[ScorecardPubSub] Subscribe error:", err);
    });

    subscriberClient.on("message", (_channel: string, message: string) => {
      try {
        const event: ScorecardChangeEvent = JSON.parse(message);
        for (const handler of handlers) {
          try {
            handler(event);
          } catch {
            // Never let one handler crash others
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });
  }
  return subscriberClient;
}

/**
 * Publish a scorecard state-change event.
 * Called from GlobalTradeTracker (close/trigger) and ScoreCardController (create/delete/manual).
 */
export async function publishScorecardChange(
  event: ScorecardChangeEvent
): Promise<void> {
  try {
    await redis.publish(CHANNEL, JSON.stringify(event));
  } catch (err) {
    console.error("[ScorecardPubSub] Publish error:", err);
  }
}

/**
 * Subscribe to scorecard change events.
 * Returns an unsubscribe function for cleanup.
 */
export function onScorecardChange(handler: ChangeHandler): () => void {
  getSubscriber();
  handlers.add(handler);

  return () => {
    handlers.delete(handler);
  };
}

/**
 * Graceful shutdown — close the subscriber connection.
 */
export async function closeScorecardPubSub(): Promise<void> {
  if (subscriberClient) {
    await subscriberClient.unsubscribe(CHANNEL);
    await subscriberClient.quit();
    subscriberClient = null;
  }
  handlers.clear();
}
