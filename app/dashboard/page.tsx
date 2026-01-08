"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import RecommendationCard, { Recommendation, Genre } from "@/components/RecommendationCard";
import AddRecommendationForm from "@/components/AddRecommendationForm";
import GenreFilter from "@/components/GenreFilter";
import { Id } from "@/convex/_generated/dataModel";

export default function Dashboard() {
    const [selectedGenre, setSelectedGenre] = useState<Genre | "all">("all");

    const getOrCreateUser = useMutation(api.users.getOrCreate);
    const currentUser = useQuery(api.users.getCurrent);

    useEffect(() => {
        getOrCreateUser();
    }, [getOrCreateUser]);

    const allRecsData = useQuery(api.recommendations.listAll, {});

    const filteredRecsData = useQuery(
        api.recommendations.listByGenre,
        selectedGenre !== "all" ? { genre: selectedGenre } : "skip"
    );

    const activeData = selectedGenre === "all" ? allRecsData : filteredRecsData;

    const addRecommendation = useMutation(api.recommendations.add);
    const deleteRecommendation = useMutation(api.recommendations.deleteOwn);
    const updateRecommendation = useMutation(api.recommendations.update);
    const toggleStaffPick = useMutation(api.recommendations.toggleStaffPick);

    const handleAdd = async (data: {
        title: string;
        genre: Genre;
        link: string;
        blurb: string;
    }) => {
        await addRecommendation(data);
    };

    const handleDelete = async (id: Id<"recommendations">) => {
        await deleteRecommendation({ id });
    };

    const handleEdit = async (
        id: Id<"recommendations">,
        data: { title: string; genre: Genre; link: string; blurb: string }
    ) => {
        await updateRecommendation({ id, ...data });
    };

    const handleToggleStaffPick = async (id: Id<"recommendations">) => {
        await toggleStaffPick({ id });
    };

    const isAdmin = activeData?.isAdmin ?? false;
    const currentUserId = activeData?.currentUserId;
    const recommendations = activeData?.recommendations ?? [];

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

                        {activeData === undefined ? (
                            <div className="space-y-4">
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
                            <div className="space-y-4">
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
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
