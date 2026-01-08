import { Id } from "@/convex/_generated/dataModel";

export type Genre =
    | "horror"
    | "action"
    | "comedy"
    | "drama"
    | "sci-fi"
    | "romance"
    | "thriller"
    | "documentary";

export type Role = "admin" | "user";

export interface Recommendation {
    _id: Id<"recommendations">;
    _creationTime: number;
    title: string;
    genre: Genre;
    link: string;
    blurb: string;
    userId: Id<"users">;
    userName: string;
    isStaffPick: boolean;
    imageId?: Id<"_storage">;
}

export interface User {
    _id: Id<"users">;
    clerkId: string;
    name: string;
    email: string;
    role: Role;
}

export interface RecommendationFormData {
    title: string;
    genre: Genre;
    link: string;
    blurb: string;
    imageId?: Id<"_storage">;
}
