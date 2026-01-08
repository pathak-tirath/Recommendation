import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const genreValidator = v.union(
  v.literal("horror"),
  v.literal("action"),
  v.literal("comedy"),
  v.literal("drama"),
  v.literal("sci-fi"),
  v.literal("romance"),
  v.literal("thriller"),
  v.literal("documentary")
);

export const roleValidator = v.union(v.literal("admin"), v.literal("user"));

export default defineSchema({
  recommendations: defineTable({
    title: v.string(),
    genre: genreValidator,
    link: v.string(),
    blurb: v.string(),
    userId: v.id("users"),
    userName: v.string(),
    isStaffPick: v.boolean(),
    imageId: v.optional(v.id("_storage")),
  })
    .index("by_genre", ["genre"])
    .index("by_userId", ["userId"]),

  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    role: roleValidator,
  }).index("by_clerkId", ["clerkId"]),

  rateLimits: defineTable({
    userId: v.id("users"),
    action: v.string(),
    count: v.number(),
    windowStart: v.number(),
  }).index("by_userId_action", ["userId", "action"]),

  fileMetadata: defineTable({
    storageId: v.id("_storage"),
    userId: v.id("users"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    uploadedAt: v.number(),
    isOrphaned: v.boolean(),
  })
    .index("by_storageId", ["storageId"])
    .index("by_userId", ["userId"])
    .index("by_orphaned", ["isOrphaned"]),
});
