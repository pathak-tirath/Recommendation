"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Genre, Recommendation } from "@/types";
import ConfirmModal from "./ConfirmModal";
import EditRecommendationModal from "./EditRecommendationModal";

interface RecommendationCardProps {
    recommendation: Recommendation;
    showActions?: boolean;
    isOwner?: boolean;
    isAdmin?: boolean;
    onDelete?: (id: Id<"recommendations">) => void;
    onEdit?: (
        id: Id<"recommendations">,
        data: { title: string; genre: Genre; link: string; blurb: string }
    ) => Promise<void>;
    onToggleStaffPick?: (id: Id<"recommendations">) => void;
}

export default function RecommendationCard({
    recommendation,
    showActions = false,
    isOwner = false,
    isAdmin = false,
    onDelete,
    onEdit,
    onToggleStaffPick,
}: RecommendationCardProps) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const canDelete = isOwner || isAdmin;
    const canEdit = isOwner || isAdmin;

    // Get image URL if imageId exists
    const imageUrl = useQuery(
        api.files.getUrl,
        recommendation.imageId ? { storageId: recommendation.imageId } : "skip"
    );

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = () => {
        if (onDelete) {
            onDelete(recommendation._id);
        }
        setShowDeleteModal(false);
    };

    const handleEditClick = () => {
        setShowEditModal(true);
    };

    const handleSaveEdit = async (data: {
        title: string;
        genre: Genre;
        link: string;
        blurb: string;
    }) => {
        if (onEdit) {
            await onEdit(recommendation._id, data);
        }
    };

    return (
        <>
            <div className="glass-card p-5 animate-fade-in hover:border-accent-primary/30 transition-all duration-300">
                <div className="flex items-start gap-4">
                    {/* Movie Poster Image */}
                    {imageUrl && (
                        <div className="shrink-0">
                            <img
                                src={imageUrl}
                                alt={recommendation.title}
                                className="w-20 h-28 object-cover rounded-lg shadow-md"
                            />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="text-lg font-semibold text-foreground truncate">
                                {recommendation.title}
                            </h3>
                            {recommendation.isStaffPick && (
                                <span className="staff-pick-badge">
                                    <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    Staff Pick
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                            <span className="genre-badge">{recommendation.genre}</span>
                            <span className="text-text-muted text-sm">
                                by {recommendation.userName}
                            </span>
                        </div>

                        <p className="text-text-secondary text-sm mb-3 line-clamp-2">
                            {recommendation.blurb}
                        </p>

                        <a
                            href={recommendation.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-accent-primary hover:text-accent-secondary transition-colors text-sm font-medium"
                        >
                            <span>View Link</span>
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                            </svg>
                        </a>
                    </div>

                    {showActions && (canEdit || canDelete || isAdmin) && (
                        <div className="flex flex-col gap-2 shrink-0">
                            {isAdmin && onToggleStaffPick && (
                                <button
                                    onClick={() => onToggleStaffPick(recommendation._id)}
                                    className={`btn-staff-pick text-xs ${recommendation.isStaffPick ? "active" : ""}`}
                                >
                                    {recommendation.isStaffPick ? "★ Picked" : "☆ Pick"}
                                </button>
                            )}
                            {canEdit && onEdit && (
                                <button onClick={handleEditClick} className="btn-edit text-xs">
                                    <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                    </svg>
                                    Edit
                                </button>
                            )}
                            {canDelete && onDelete && (
                                <button
                                    onClick={handleDeleteClick}
                                    className="btn-danger text-xs"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Recommendation"
                message={`Are you sure you want to delete "${recommendation.title}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />

            {/* Edit Modal */}
            <EditRecommendationModal
                isOpen={showEditModal}
                recommendation={recommendation}
                onSave={handleSaveEdit}
                onClose={() => setShowEditModal(false)}
            />
        </>
    );
}
