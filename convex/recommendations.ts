import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { genreValidator } from "./schema";
import { getCurrentUser, requireAuth, requireAdmin } from "./lib/auth";
import { checkRateLimit, RATE_LIMITS } from "./lib/rateLimit";
import { validateRecommendation } from "./lib/validation";

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
        await checkRateLimit(ctx, user._id, RATE_LIMITS.ADD_RECOMMENDATION);

        const validation = validateRecommendation({
            title: args.title,
            blurb: args.blurb,
            link: args.link,
        });
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        if (args.imageId) {
            const fileMetadata = await ctx.db
                .query("fileMetadata")
                .withIndex("by_storageId", (q) => q.eq("storageId", args.imageId!))
                .unique();

            if (!fileMetadata) {
                throw new Error("Image file not found");
            }

            if (fileMetadata.userId !== user._id && user.role !== "admin") {
                throw new Error("You don't have permission to use this image");
            }

            await ctx.db.patch(fileMetadata._id, {
                isOrphaned: false,
            });
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

        // Mark image as orphaned if it exists
        if (recommendation.imageId) {
            const fileMetadata = await ctx.db
                .query("fileMetadata")
                .withIndex("by_storageId", (q) => q.eq("storageId", recommendation.imageId!))
                .unique();

            if (fileMetadata) {
                // Check if image is used in other recommendations
                const otherRecommendations = await ctx.db
                    .query("recommendations")
                    .filter((q) =>
                        q.and(
                            q.eq(q.field("imageId"), recommendation.imageId),
                            q.neq(q.field("_id"), args.id)
                        )
                    )
                    .collect();

                // Only mark as orphaned if not used elsewhere
                if (otherRecommendations.length === 0) {
                    await ctx.db.patch(fileMetadata._id, {
                        isOrphaned: true,
                    });
                }
            }
        }

        await ctx.db.delete(args.id);
    },
});

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

        // Mark image as orphaned if it exists
        if (recommendation.imageId) {
            const fileMetadata = await ctx.db
                .query("fileMetadata")
                .withIndex("by_storageId", (q) => q.eq("storageId", recommendation.imageId!))
                .unique();

            if (fileMetadata) {
                // Check if image is used in other recommendations
                const otherRecommendations = await ctx.db
                    .query("recommendations")
                    .filter((q) =>
                        q.and(
                            q.eq(q.field("imageId"), recommendation.imageId),
                            q.neq(q.field("_id"), args.id)
                        )
                    )
                    .collect();

                // Only mark as orphaned if not used elsewhere
                if (otherRecommendations.length === 0) {
                    await ctx.db.patch(fileMetadata._id, {
                        isOrphaned: true,
                    });
                }
            }
        }

        await ctx.db.delete(args.id);
    },
});

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

        // Verify file ownership if new image is provided
        if (args.imageId) {
            const fileMetadata = await ctx.db
                .query("fileMetadata")
                .withIndex("by_storageId", (q) => q.eq("storageId", args.imageId!))
                .unique();

            if (!fileMetadata) {
                throw new Error("Image file not found");
            }

            if (fileMetadata.userId !== user._id && user.role !== "admin") {
                throw new Error("You don't have permission to use this image");
            }

            // Mark new file as not orphaned
            await ctx.db.patch(fileMetadata._id, {
                isOrphaned: false,
            });
        }

        // Handle old image if being replaced
        if (recommendation.imageId && recommendation.imageId !== args.imageId) {
            const oldFileMetadata = await ctx.db
                .query("fileMetadata")
                .withIndex("by_storageId", (q) => q.eq("storageId", recommendation.imageId!))
                .unique();

            if (oldFileMetadata) {
                // Check if old image is used in other recommendations
                const otherRecommendations = await ctx.db
                    .query("recommendations")
                    .filter((q) =>
                        q.and(
                            q.eq(q.field("imageId"), recommendation.imageId),
                            q.neq(q.field("_id"), args.id)
                        )
                    )
                    .collect();

                // Only mark as orphaned if not used elsewhere
                if (otherRecommendations.length === 0) {
                    await ctx.db.patch(oldFileMetadata._id, {
                        isOrphaned: true,
                    });
                }
            }
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
