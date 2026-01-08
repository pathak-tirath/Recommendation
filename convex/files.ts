import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin } from "./lib/auth";
import { checkRateLimit, RATE_LIMITS } from "./lib/rateLimit";
import { validateFile, sanitizeFileName } from "./lib/fileValidation";


export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await requireAuth(ctx);

        // Rate limiting
        await checkRateLimit(ctx, user._id, RATE_LIMITS.UPLOAD_FILE);

        return await ctx.storage.generateUploadUrl();
    },
});


export const confirmUpload = mutation({
    args: {
        storageId: v.id("_storage"),
        fileName: v.string(),
        fileSize: v.number(),
        mimeType: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);

        // Sanitize filename
        const sanitizedFileName = sanitizeFileName(args.fileName);

        // Validate file
        const validation = validateFile(
            sanitizedFileName,
            args.fileSize,
            args.mimeType
        );

        if (!validation.isValid) {
            // Delete the uploaded file if validation fails
            await ctx.storage.delete(args.storageId);
            throw new Error(validation.error);
        }

        // Create metadata entry
        const metadataId = await ctx.db.insert("fileMetadata", {
            storageId: args.storageId,
            userId: user._id,
            fileName: sanitizedFileName,
            fileSize: args.fileSize,
            mimeType: args.mimeType,
            uploadedAt: Date.now(),
            isOrphaned: false,
        });

        return {
            storageId: args.storageId,
            metadataId,
        };
    },
});

export const getUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

export const deleteFile = mutation({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);
        await checkRateLimit(ctx, user._id, RATE_LIMITS.DELETE_FILE);

        const metadata = await ctx.db
            .query("fileMetadata")
            .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
            .unique();

        if (!metadata) {
            throw new Error("File not found");
        }

        if (metadata.userId !== user._id && user.role !== "admin") {
            throw new Error("You don't have permission to delete this file");
        }

        const recommendationsUsingFile = await ctx.db
            .query("recommendations")
            .filter((q) => q.eq(q.field("imageId"), args.storageId))
            .collect();

        if (recommendationsUsingFile.length > 0) {
            throw new Error(
                "Cannot delete file: it is currently being used in recommendations"
            );
        }

        await ctx.storage.delete(args.storageId);
        await ctx.db.delete(metadata._id);
    },
});

export const markFileAsOrphaned = mutation({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        await requireAuth(ctx);

        const metadata = await ctx.db
            .query("fileMetadata")
            .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
            .unique();

        if (metadata) {
            await ctx.db.patch(metadata._id, {
                isOrphaned: true,
            });
        }
    },
});

export const getUserFiles = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireAuth(ctx);

        const files = await ctx.db
            .query("fileMetadata")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .collect();

        const filesWithUsage = await Promise.all(
            files.map(async (file) => {
                const recommendations = await ctx.db
                    .query("recommendations")
                    .filter((q) => q.eq(q.field("imageId"), file.storageId))
                    .collect();

                return {
                    ...file,
                    isInUse: recommendations.length > 0,
                    usedInRecommendations: recommendations.length,
                };
            })
        );

        return filesWithUsage;
    },
});

export const cleanupOrphanedFiles = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await requireAdmin(ctx);
        await checkRateLimit(ctx, user._id, RATE_LIMITS.CLEANUP_FILES);

        const orphanedFiles = await ctx.db
            .query("fileMetadata")
            .withIndex("by_orphaned", (q) => q.eq("isOrphaned", true))
            .collect();

        let deletedCount = 0;

        for (const file of orphanedFiles) {
            const recommendations = await ctx.db
                .query("recommendations")
                .filter((q) => q.eq(q.field("imageId"), file.storageId))
                .collect();

            if (recommendations.length === 0) {
                try {
                    await ctx.storage.delete(file.storageId);
                    await ctx.db.delete(file._id);
                    deletedCount++;
                } catch (error) {
                    console.error(`Failed to delete file ${file.storageId}:`, error);
                }
            }
        }

        return {
            deletedCount,
            message: `Successfully cleaned up ${deletedCount} orphaned files`,
        };
    },
});

export const verifyFileOwnership = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);

        const metadata = await ctx.db
            .query("fileMetadata")
            .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
            .unique();

        if (!metadata) {
            return { canUse: false, error: "File not found" };
        }

        const canUse = metadata.userId === user._id || user.role === "admin";

        return {
            canUse,
            metadata: canUse ? metadata : undefined,
            error: canUse ? undefined : "You don't have permission to use this file",
        };
    },
});
