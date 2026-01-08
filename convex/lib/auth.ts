import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

export type Role = "admin" | "user";

export const ADMIN_EMAILS = [
    "pathak.tirath.work@gmail.com",
    "hypershelf@yopmail.com"
];

/**
 * Get the current authenticated user from the database.
 * Returns null if not authenticated or user doesn't exist yet.
 */
export async function getCurrentUser(
    ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .unique();

    return user;
}

/**
 * Require authentication. Throws if user is not authenticated.
 */
export async function requireAuth(
    ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
    const user = await getCurrentUser(ctx);
    if (!user) {
        throw new Error("Authentication required");
    }
    return user;
}

/**
 * Require admin role. Throws if user is not an admin.
 */
export async function requireAdmin(
    ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
    const user = await requireAuth(ctx);
    if (user.role !== "admin") {
        throw new Error("Admin access required");
    }
    return user;
}

/**
 * Check if the current user is an admin.
 */
export async function isAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
    const user = await getCurrentUser(ctx);
    return user?.role === "admin";
}
