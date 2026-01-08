"use client";

import { Genre } from "@/types";

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

interface GenreFilterProps {
    selectedGenre: Genre | "all";
    onGenreChange: (genre: Genre | "all") => void;
}

export default function GenreFilter({
    selectedGenre,
    onGenreChange,
}: GenreFilterProps) {
    return (
        <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-text-secondary">
                Filter by:
            </label>
            <select
                value={selectedGenre}
                onChange={(e) => onGenreChange(e.target.value as Genre | "all")}
                className="form-select w-auto min-w-[140px]"
            >
                <option value="all">All Genres</option>
                {GENRES.map((g) => (
                    <option key={g} value={g}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                    </option>
                ))}
            </select>
        </div>
    );
}
