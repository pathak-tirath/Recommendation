import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ADMIN_EMAILS } from "./lib/auth";

/**
 * Get or create a user based on their Clerk identity.
 * Called when a user signs in for the first time.
 */
export const getOrCreate = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        // Check if user already exists
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        const shouldBeAdmin =
            identity.email && ADMIN_EMAILS.includes(identity.email);

        if (existingUser) {

            if (shouldBeAdmin && existingUser.role !== "admin") {
                await ctx.db.patch(existingUser._id, { role: "admin" });
            }
            return existingUser;
        }

        // Create new user with default "user" role
        const userId = await ctx.db.insert("users", {
            clerkId: identity.subject,
            name: identity.name ?? identity.email ?? "Anonymous",
            email: identity.email ?? "",
            role: shouldBeAdmin ? "admin" : "user",
        });

        return await ctx.db.get(userId);
    },
});

/**
 * Get the current user's information.
 */
export const getCurrent = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        return user;
    },
});

/**
 * Set a user's role (admin only).
 */
export const setRole = mutation({
    args: {
        userId: v.id("users"),
        role: v.union(v.literal("admin"), v.literal("user")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        // Get the current user
        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser || currentUser.role !== "admin") {
            throw new Error("Admin access required");
        }

        await ctx.db.patch(args.userId, { role: args.role });
    },
});
