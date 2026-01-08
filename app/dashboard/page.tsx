"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import RecommendationCard from "@/components/RecommendationCard";
import AddRecommendationForm from "@/components/AddRecommendationForm";
import GenreFilter from "@/components/GenreFilter";
import { Id } from "@/convex/_generated/dataModel";
import { Genre, Recommendation } from "@/types";

const PAGE_SIZE = 2;

export default function Dashboard() {
    const [selectedGenre, setSelectedGenre] = useState<Genre | "all">("all");
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const getOrCreateUser = useMutation(api.users.getOrCreate);
    const currentUser = useQuery(api.users.getCurrent);

    useEffect(() => {
        getOrCreateUser();
    }, [getOrCreateUser]);

    // Paginated query for all recommendations
    const allRecsResult = usePaginatedQuery(
        api.recommendations.paginatedList,
        selectedGenre === "all" ? {} : "skip",
        { initialNumItems: PAGE_SIZE }
    );

    // Paginated query for filtered recommendations
    const filteredRecsResult = usePaginatedQuery(
        api.recommendations.paginatedListByGenre,
        selectedGenre !== "all" ? { genre: selectedGenre } : "skip",
        { initialNumItems: PAGE_SIZE }
    );

    const activeResult = selectedGenre === "all" ? allRecsResult : filteredRecsResult;

    // Handle infinite scroll with Intersection Observer
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        const loadMoreElement = loadMoreRef.current;

        if (!loadMoreElement) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && activeResult.status === "CanLoadMore") {
                    activeResult.loadMore(PAGE_SIZE);
                }
            },
            {
                root: scrollContainer,
                rootMargin: "100px"
            }
        );

        observer.observe(loadMoreElement);

        return () => observer.disconnect();
    }, [activeResult]);

    const addRecommendation = useMutation(api.recommendations.add);
    const deleteRecommendation = useMutation(api.recommendations.deleteOwn);
    const updateRecommendation = useMutation(api.recommendations.update);
    const toggleStaffPick = useMutation(api.recommendations.toggleStaffPick);

    const handleAdd = useCallback(async (data: {
        title: string;
        genre: Genre;
        link: string;
        blurb: string;
        imageId?: Id<"_storage">;
    }) => {
        await addRecommendation(data);
    }, [addRecommendation]);

    const handleDelete = useCallback(async (id: Id<"recommendations">) => {
        await deleteRecommendation({ id });
    }, [deleteRecommendation]);

    const handleEdit = useCallback(async (
        id: Id<"recommendations">,
        data: { title: string; genre: Genre; link: string; blurb: string; imageId?: Id<"_storage"> }
    ) => {
        await updateRecommendation({ id, ...data });
    }, [updateRecommendation]);

    const handleToggleStaffPick = useCallback(async (id: Id<"recommendations">) => {
        await toggleStaffPick({ id });
    }, [toggleStaffPick]);

    // Extract data from paginated result
    const recommendations = activeResult.results ?? [];

    // Get admin status and user ID from the current user query
    const isAdmin = currentUser?.role === "admin";
    const currentUserId = currentUser?._id;

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-x-0 border-t-0">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold gradient-text">
                        HypeShelf
                    </Link>
                    <div className="flex items-center gap-4">
                        {currentUser && (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-text-secondary hidden sm:block">
                                    {currentUser.name}
                                </span>
                                {isAdmin && (
                                    <span className="text-xs bg-accent-primary/20 text-accent-primary px-2 py-1 rounded-full font-medium">
                                        Admin
                                    </span>
                                )}
                            </div>
                        )}
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-12 px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Welcome */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            Welcome back{currentUser ? `, ${currentUser.name.split(" ")[0]}` : ""}! 👋
                        </h1>
                        <p className="text-text-muted">
                            Share something you&apos;re hyped about with the community.
                        </p>
                    </div>

                    {/* Add Recommendation Form */}
                    <div className="mb-8">
                        <AddRecommendationForm onSubmit={handleAdd} />
                    </div>

                    {/* Recommendations List */}
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <h2 className="text-xl font-bold">All Recommendations</h2>
                            <GenreFilter
                                selectedGenre={selectedGenre}
                                onGenreChange={setSelectedGenre}
                            />
                        </div>

                        {activeResult.status === "LoadingFirstPage" ? (
                            <div className="h-[70vh] overflow-y-auto space-y-4 pr-2">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="glass-card p-5">
                                        <div className="skeleton h-6 w-48 mb-3" />
                                        <div className="skeleton h-4 w-24 mb-3" />
                                        <div className="skeleton h-4 w-full mb-2" />
                                        <div className="skeleton h-4 w-3/4" />
                                    </div>
                                ))}
                            </div>
                        ) : recommendations.length === 0 ? (
                            <div className="glass-card p-12 text-center">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-semibold mb-2">
                                    {selectedGenre === "all"
                                        ? "No recommendations yet"
                                        : `No ${selectedGenre} recommendations`}
                                </h3>
                                <p className="text-text-muted">
                                    {selectedGenre === "all"
                                        ? "Be the first to add one above!"
                                        : "Try selecting a different genre or add one yourself!"}
                                </p>
                            </div>
                        ) : (
                            <div ref={scrollContainerRef} className="h-[70vh] overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                                {recommendations.map((rec) => (
                                    <RecommendationCard
                                        key={rec._id}
                                        recommendation={rec as Recommendation}
                                        showActions={true}
                                        isOwner={currentUserId === rec.userId}
                                        isAdmin={isAdmin}
                                        onDelete={handleDelete}
                                        onEdit={handleEdit}
                                        onToggleStaffPick={handleToggleStaffPick}
                                    />
                                ))}

                                {/* Infinite scroll trigger */}
                                <div ref={loadMoreRef} className="py-4">
                                    {activeResult.status === "LoadingMore" && (
                                        <div className="flex justify-center">
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                                                <span>Loading more...</span>
                                            </div>
                                        </div>
                                    )}
                                    {activeResult.status === "Exhausted" && recommendations.length > PAGE_SIZE && (
                                        <p className="text-center text-text-muted text-sm">
                                            You&apos;ve reached the end! 🎉
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

