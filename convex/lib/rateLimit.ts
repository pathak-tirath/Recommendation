import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

interface RateLimitConfig {
    action: string;
    maxRequests: number;
}

export async function checkRateLimit(
    ctx: MutationCtx,
    userId: Id<"users">,
    config: RateLimitConfig
): Promise<void> {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    const existing = await ctx.db
        .query("rateLimits")
        .withIndex("by_userId_action", (q) =>
            q.eq("userId", userId).eq("action", config.action)
        )
        .unique();

    if (existing) {
        if (existing.windowStart < windowStart) {
            await ctx.db.patch(existing._id, {
                count: 1,
                windowStart: now,
            });
        } else {
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
        await ctx.db.insert("rateLimits", {
            userId,
            action: config.action,
            count: 1,
            windowStart: now,
        });
    }
}

export const RATE_LIMITS = {
    ADD_RECOMMENDATION: { action: "add_recommendation", maxRequests: 10 },
    UPDATE_RECOMMENDATION: { action: "update_recommendation", maxRequests: 2 },
    DELETE_RECOMMENDATION: { action: "delete_recommendation", maxRequests: 10 },
    ADMIN_DELETE: { action: "admin_delete", maxRequests: 5 },
    TOGGLE_STAFF_PICK: { action: "toggle_staff_pick", maxRequests: 20 },
    UPLOAD_FILE: { action: "upload_file", maxRequests: 10 },
    DELETE_FILE: { action: "delete_file", maxRequests: 10 },
    CLEANUP_FILES: { action: "cleanup_files", maxRequests: 2 },
} as const;
