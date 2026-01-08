"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Genre, Recommendation } from "@/types";

const GENRES: Genre[] = [
    "horror",
    "action",
    "comedy",
    "drama",
    "sci-fi",
    "romance",
    "thriller",
    "documentary",
];

// Zod schema for form validation
const recommendationSchema = z.object({
    title: z
        .string()
        .min(1, "Title is required")
        .min(2, "Title must be at least 2 characters")
        .max(100, "Title must be less than 100 characters"),
    genre: z.enum([
        "horror",
        "action",
        "comedy",
        "drama",
        "sci-fi",
        "romance",
        "thriller",
        "documentary",
    ]),
    link: z
        .string()
        .min(1, "Link is required")
        .refine(
            (val) => {
                const urlPattern =
                    /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
                return urlPattern.test(val);
            },
            { message: "Please enter a valid URL (e.g., https://example.com)" }
        ),
    blurb: z
        .string()
        .min(1, "Blurb is required")
        .min(10, "Blurb must be at least 10 characters")
        .max(500, "Blurb must be less than 500 characters"),
});

type RecommendationFormData = z.infer<typeof recommendationSchema>;

interface EditRecommendationModalProps {
    isOpen: boolean;
    recommendation: Recommendation;
    onSave: (data: {
        title: string;
        genre: Genre;
        link: string;
        blurb: string;
        imageId?: Id<"_storage">;
    }) => Promise<void>;
    onClose: () => void;
}

export default function EditRecommendationModal({
    isOpen,
    recommendation,
    onSave,
    onClose,
}: EditRecommendationModalProps) {
    const [submitError, setSubmitError] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [removeImage, setRemoveImage] = useState(false);

    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    // Get existing image URL
    const existingImageUrl = useQuery(
        api.files.getUrl,
        recommendation.imageId ? { storageId: recommendation.imageId } : "skip"
    );

    // Initial image preview setup
    useEffect(() => {
        if (existingImageUrl && !imagePreview && !removeImage) {
            setImagePreview(existingImageUrl);
        }
    }, [existingImageUrl, imagePreview, removeImage]);

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors, isSubmitting, isValid, touchedFields, dirtyFields },
    } = useForm<RecommendationFormData>({
        resolver: zodResolver(recommendationSchema),
        mode: "onChange",
        defaultValues: {
            title: recommendation.title,
            genre: recommendation.genre,
            link: recommendation.link,
            blurb: recommendation.blurb,
        },
    });

    const titleValue = watch("title");
    const blurbValue = watch("blurb");
    const linkValue = watch("link");

    // Reset form when recommendation changes or modal opens
    useEffect(() => {
        if (isOpen) {
            reset({
                title: recommendation.title,
                genre: recommendation.genre,
                link: recommendation.link,
                blurb: recommendation.blurb,
            });
            setSubmitError("");
        }
    }, [isOpen, recommendation, reset]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !isSubmitting) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, isSubmitting, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const onFormSubmit = async (data: RecommendationFormData) => {
        setSubmitError("");
        try {
            let imageId = recommendation.imageId;

            if (removeImage) {
                imageId = undefined;
            } else if (selectedImage) {
                // Upload new image
                const postUrl = await generateUploadUrl();
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": selectedImage.type },
                    body: selectedImage,
                });
                const json = await result.json();

                if (!result.ok) {
                    throw new Error(`Upload failed: ${JSON.stringify(json)}`);
                }

                imageId = json.storageId;
            }

            await onSave({
                title: data.title.trim(),
                genre: data.genre,
                link: data.link.trim(),
                blurb: data.blurb.trim(),
                imageId,
            });
            onClose();
        } catch (err) {
            // Extract user-friendly message from Convex errors
            // Convex errors look like: "[CONVEX M(...)] Server Error Uncaught Error: <message>"
            let message = "Failed to update recommendation";
            if (err instanceof Error) {
                const match = err.message.match(/Error:\s*(.+?)(?:\s*at\s|$)/);
                message = match ? match[1].trim() : err.message;
            }
            setSubmitError(message);
        }
    };

    // Helper to get input class based on validation state
    const getInputClass = (
        fieldName: keyof RecommendationFormData,
        baseClass: string
    ) => {
        const hasError = errors[fieldName];
        const isTouched = touchedFields[fieldName];
        const isDirty = dirtyFields[fieldName];

        if (!isTouched && !isDirty) return baseClass;
        if (hasError)
            return `${baseClass} border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]`;
        return `${baseClass} border-success focus:border-success focus:shadow-[0_0_0_3px_rgba(16,185,129,0.2)]`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={() => !isSubmitting && onClose()}
            />

            {/* Modal */}
            <div
                className="relative glass-card p-6 max-w-2xl w-full animate-fade-in max-h-[90vh] overflow-y-auto"
                style={{ animationDuration: "0.2s" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold gradient-text">
                        Edit Recommendation
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-text-muted hover:text-foreground transition-colors p-1"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Submit Error */}
                {submitError && (
                    <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        {submitError}
                    </div>
                )}

                <form onSubmit={handleSubmit(onFormSubmit)}>
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Title Field */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Title <span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                {...register("title")}
                                placeholder="What are you recommending?"
                                className={getInputClass("title", "form-input")}
                                disabled={isSubmitting}
                                maxLength={100}
                            />
                            {errors.title && (
                                <p className="text-danger text-xs mt-1 flex items-center gap-1">
                                    <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    {errors.title.message}
                                </p>
                            )}
                            {!errors.title && titleValue && (
                                <p className="text-text-muted text-xs mt-1">
                                    {titleValue.length}/100 characters
                                </p>
                            )}
                        </div>

                        {/* Genre Field */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Genre <span className="text-danger">*</span>
                            </label>
                            <select
                                {...register("genre")}
                                className="form-select"
                                disabled={isSubmitting}
                            >
                                {GENRES.map((g) => (
                                    <option key={g} value={g}>
                                        {g.charAt(0).toUpperCase() + g.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Link Field */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Link <span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                {...register("link")}
                                placeholder="https://example.com"
                                className={getInputClass("link", "form-input")}
                                disabled={isSubmitting}
                            />
                            {errors.link && (
                                <p className="text-danger text-xs mt-1 flex items-center gap-1">
                                    <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    {errors.link.message}
                                </p>
                            )}
                            {!errors.link && linkValue && dirtyFields.link && (
                                <p className="text-success text-xs mt-1 flex items-center gap-1">
                                    <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Valid URL
                                </p>
                            )}
                        </div>

                        {/* Blurb Field */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Short Blurb <span className="text-danger">*</span>
                            </label>
                            <textarea
                                {...register("blurb")}
                                placeholder="Why are you hyped about this? (min 10 characters)"
                                className={getInputClass("blurb", "form-textarea")}
                                rows={3}
                                disabled={isSubmitting}
                                maxLength={500}
                            />
                            <div className="flex justify-between items-center mt-1">
                                {errors.blurb ? (
                                    <p className="text-danger text-xs flex items-center gap-1">
                                        <svg
                                            className="w-3 h-3"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        {errors.blurb.message}
                                    </p>
                                ) : (
                                    <span />
                                )}
                                <p
                                    className={`text-xs ${(blurbValue?.length || 0) > 450 ? "text-staff-pick" : "text-text-muted"}`}
                                >
                                    {blurbValue?.length || 0}/500 characters
                                </p>
                            </div>
                        </div>
                        {/* Image Upload Field */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Movie Poster <span className="text-text-muted text-xs">(optional)</span>
                            </label>
                            <div className="flex items-start gap-4">
                                {(imagePreview || existingImageUrl) && !removeImage && (
                                    <div className="relative group shrink-0">
                                        <img
                                            src={selectedImage ? imagePreview! : existingImageUrl!}
                                            alt="Preview"
                                            className="w-20 h-28 object-cover rounded-lg shadow-md"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedImage(null);
                                                setImagePreview(null);
                                                setRemoveImage(true);
                                            }}
                                            className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setSelectedImage(file);
                                                setImagePreview(URL.createObjectURL(file));
                                                setRemoveImage(false);
                                            }
                                        }}
                                        className="block w-full text-sm text-text-muted
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-full file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-accent-primary/10 file:text-accent-primary
                                            hover:file:bg-accent-primary/20
                                            transition-all"
                                        disabled={isSubmitting}
                                    />
                                    <p className="mt-1 text-xs text-text-muted">
                                        Change poster (JPG, PNG, WebP up to 5MB)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting || !isValid}
                        >
                            {isSubmitting ? (
                                <>
                                    <svg
                                        className="animate-spin h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        />
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                <>
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
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
