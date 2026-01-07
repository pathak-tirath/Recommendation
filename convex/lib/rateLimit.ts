import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

interface RateLimitConfig {
    action: string;
    maxRequests: number;
}

/**
 * Check and update rate limit for a user action.
 * Throws an error if rate limit is exceeded.
 */
export async function checkRateLimit(
    ctx: MutationCtx,
    userId: Id<"users">,
    config: RateLimitConfig
): Promise<void> {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Find existing rate limit record
    const existing = await ctx.db
        .query("rateLimits")
        .withIndex("by_userId_action", (q) =>
            q.eq("userId", userId).eq("action", config.action)
        )
        .unique();

    if (existing) {
        // Check if we're in a new window
        if (existing.windowStart < windowStart) {
            // Reset the counter for new window
            await ctx.db.patch(existing._id, {
                count: 1,
                windowStart: now,
            });
        } else {
            // Still in current window
            if (existing.count >= config.maxRequests) {
                throw new Error(
                    `Whoa, slow down! 🚀 You've reached the limit of ${config.maxRequests} requests per minute. Please wait a moment and try again.`
                );
            }
            await ctx.db.patch(existing._id, {
                count: existing.count + 1,
            });
        }
    } else {
        // Create new rate limit record
        await ctx.db.insert("rateLimits", {
            userId,
            action: config.action,
            count: 1,
            windowStart: now,
        });
    }
}

/**
 * Pre-configured rate limits for different actions
 */
export const RATE_LIMITS = {
    ADD_RECOMMENDATION: { action: "add_recommendation", maxRequests: 10 },
    UPDATE_RECOMMENDATION: { action: "update_recommendation", maxRequests: 2 },
    DELETE_RECOMMENDATION: { action: "delete_recommendation", maxRequests: 10 },
    ADMIN_DELETE: { action: "admin_delete", maxRequests: 5 },
    TOGGLE_STAFF_PICK: { action: "toggle_staff_pick", maxRequests: 20 },
} as const;
