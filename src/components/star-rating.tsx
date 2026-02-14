"use client";

import { useState } from "react";

export function StarRating({
  rating,
  count,
  interactive = false,
  onRate,
  userRating,
}: {
  rating: number;
  count: number;
  interactive?: boolean;
  onRate?: (stars: number) => void;
  userRating?: number | null;
}) {
  const [hovered, setHovered] = useState(0);
  const displayRating = hovered || userRating || rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={`text-lg transition-colors ${
              interactive ? "cursor-pointer hover:scale-110" : "cursor-default"
            } ${star <= displayRating ? "text-amber-400" : "text-gray-300"}`}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            onClick={() => interactive && onRate?.(star)}
          >
            &#9733;
          </button>
        ))}
      </div>
      <span className="text-sm text-navy-light">
        {rating > 0 ? `${rating.toFixed(1)}` : "No ratings"} ({count})
      </span>
    </div>
  );
}
