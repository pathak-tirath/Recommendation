import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

/**
 * Generate a short-lived upload URL for file uploads.
 * The URL is valid for a short period and allows uploading one file.
 */
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        await requireAuth(ctx);
        return await ctx.storage.generateUploadUrl();
    },
});

/**
 * Get the serving URL for a stored file.
 */
export const getUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

/**
 * Delete a file from storage.
 */
export const deleteFile = mutation({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        await ctx.storage.delete(args.storageId);
    },
});
