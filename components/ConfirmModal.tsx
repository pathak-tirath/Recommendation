"use client";

import { useEffect, useRef } from "react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: "danger" | "warning" | "default";
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    variant = "default",
}: ConfirmModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onCancel();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onCancel]);

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

    if (!isOpen) return null;

    const confirmButtonClass =
        variant === "danger"
            ? "bg-danger hover:bg-danger/80"
            : variant === "warning"
                ? "bg-staff-pick text-black hover:bg-staff-pick/80"
                : "bg-accent-primary hover:bg-accent-primary/80";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onCancel}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className="relative glass-card p-6 max-w-md w-full mx-4 animate-fade-in"
                style={{ animationDuration: "0.2s" }}
            >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    {variant === "danger" ? (
                        <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center">
                            <svg
                                className="w-6 h-6 text-danger"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                        </div>
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center">
                            <svg
                                className="w-6 h-6 text-accent-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-center mb-2">{title}</h3>

                {/* Message */}
                <p className="text-text-muted text-center mb-6">{message}</p>

                {/* Actions */}
                <div className="flex gap-3 justify-center">
                    <button onClick={onCancel} className="btn-secondary px-6">
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2 rounded-lg font-medium text-white transition-all ${confirmButtonClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
