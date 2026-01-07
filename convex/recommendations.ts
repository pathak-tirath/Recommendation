import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { genreValidator } from "./schema";
import { getCurrentUser, requireAuth, requireAdmin } from "./lib/auth";
import { checkRateLimit, RATE_LIMITS } from "./lib/rateLimit";
import { validateRecommendation } from "./lib/validation";

/**
 * Get the latest recommendations (public, for homepage).
 */
export const listLatest = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 5;
        const recommendations = await ctx.db
            .query("recommendations")
            .order("desc")
            .take(limit);

        return recommendations.reverse();
    },
});

/**
 * Get all recommendations (authenticated).
 */
export const listAll = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Authentication required");
        }

        const recommendations = await ctx.db
            .query("recommendations")
            .order("desc")
            .collect();

        const currentUser = await getCurrentUser(ctx);
        const userIsAdmin = currentUser?.role === "admin";

        return {
            recommendations: recommendations.reverse(),
            isAdmin: userIsAdmin,
            currentUserId: currentUser?._id,
        };
    },
});

/**
 * Get recommendations filtered by genre (authenticated).
 */
export const listByGenre = query({
    args: {
        genre: genreValidator,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Authentication required");
        }

        const recommendations = await ctx.db
            .query("recommendations")
            .withIndex("by_genre", (q) => q.eq("genre", args.genre))
            .order("desc")
            .collect();

        const currentUser = await getCurrentUser(ctx);
        const userIsAdmin = currentUser?.role === "admin";

        return {
            recommendations: recommendations.reverse(),
            isAdmin: userIsAdmin,
            currentUserId: currentUser?._id,
        };
    },
});

/**
 * Add a new recommendation (authenticated).
 * - Rate limited: 10 requests per minute
 * - Input validated: title (3-100 chars), blurb (10-500 chars), valid URL
 */
export const add = mutation({
    args: {
        title: v.string(),
        genre: genreValidator,
        link: v.string(),
        blurb: v.string(),
        imageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);

        // Rate limiting
        await checkRateLimit(ctx, user._id, RATE_LIMITS.ADD_RECOMMENDATION);

        // Input validation
        const validation = validateRecommendation({
            title: args.title,
            blurb: args.blurb,
            link: args.link,
        });
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        const id = await ctx.db.insert("recommendations", {
            title: validation.sanitized!.title,
            genre: args.genre,
            link: validation.sanitized!.link,
            blurb: validation.sanitized!.blurb,
            userId: user._id,
            userName: user.name,
            isStaffPick: false,
            imageId: args.imageId,
        });

        return id;
    },
});

/**
 * Delete own recommendation (authenticated).
 * - Rate limited: 10 requests per minute
 */
export const deleteOwn = mutation({
    args: {
        id: v.id("recommendations"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);

        // Rate limiting
        await checkRateLimit(ctx, user._id, RATE_LIMITS.DELETE_RECOMMENDATION);

        const recommendation = await ctx.db.get(args.id);
        if (!recommendation) {
            throw new Error("Recommendation not found");
        }

        if (recommendation.userId !== user._id && user.role !== "admin") {
            throw new Error("You can only delete your own recommendations");
        }

        await ctx.db.delete(args.id);
    },
});

/**
 * Delete any recommendation (admin only).
 * - Rate limited: 5 requests per minute
 */
export const deleteAny = mutation({
    args: {
        id: v.id("recommendations"),
    },
    handler: async (ctx, args) => {
        const user = await requireAdmin(ctx);

        // Rate limiting
        await checkRateLimit(ctx, user._id, RATE_LIMITS.ADMIN_DELETE);

        const recommendation = await ctx.db.get(args.id);
        if (!recommendation) {
            throw new Error("Recommendation not found");
        }

        await ctx.db.delete(args.id);
    },
});

/**
 * Toggle staff pick status (admin only).
 * - Rate limited: 20 requests per minute
 */
export const toggleStaffPick = mutation({
    args: {
        id: v.id("recommendations"),
    },
    handler: async (ctx, args) => {
        const user = await requireAdmin(ctx);

        // Rate limiting
        await checkRateLimit(ctx, user._id, RATE_LIMITS.TOGGLE_STAFF_PICK);

        const recommendation = await ctx.db.get(args.id);
        if (!recommendation) {
            throw new Error("Recommendation not found");
        }

        await ctx.db.patch(args.id, {
            isStaffPick: !recommendation.isStaffPick,
        });
    },
});

/**
 * Update a recommendation (owner or admin).
 * - Rate limited: 20 requests per minute
 * - Input validated: title (3-100 chars), blurb (10-500 chars), valid URL
 */
export const update = mutation({
    args: {
        id: v.id("recommendations"),
        title: v.string(),
        genre: genreValidator,
        link: v.string(),
        blurb: v.string(),
        imageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);

        // Rate limiting
        await checkRateLimit(ctx, user._id, RATE_LIMITS.UPDATE_RECOMMENDATION);

        // Input validation
        const validation = validateRecommendation({
            title: args.title,
            blurb: args.blurb,
            link: args.link,
        });
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        const recommendation = await ctx.db.get(args.id);
        if (!recommendation) {
            throw new Error("Recommendation not found");
        }

        // Check permission: owner or admin
        if (recommendation.userId !== user._id && user.role !== "admin") {
            throw new Error("You can only edit your own recommendations");
        }

        await ctx.db.patch(args.id, {
            title: validation.sanitized!.title,
            genre: args.genre,
            link: validation.sanitized!.link,
            blurb: validation.sanitized!.blurb,
            imageId: args.imageId,
        });
    },
});
