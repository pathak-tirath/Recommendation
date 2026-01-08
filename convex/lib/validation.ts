export interface ValidationResult {
    isValid: boolean;
    error?: string;
    sanitized: string;
}

export function validateTitle(title: string): ValidationResult {
    const trimmed = title.trim();
    const sanitized = sanitizeString(title);

    // Check if content was stripped (potential XSS attempt)
    if (trimmed.length > 0 && sanitized.length < trimmed.length * 0.5) {
        return {
            isValid: false,
            error: "Title contains invalid characters or HTML tags that are not allowed",
            sanitized,
        };
    }

    if (sanitized.length < 3) {
        return {
            isValid: false,
            error: "Title must be at least 3 characters long",
            sanitized,
        };
    }

    if (sanitized.length > 100) {
        return {
            isValid: false,
            error: "Title must be at most 100 characters long",
            sanitized,
        };
    }

    return { isValid: true, sanitized };
}


export function validateBlurb(blurb: string): ValidationResult {
    const trimmed = blurb.trim();
    const sanitized = sanitizeString(blurb);

    // Check if content was stripped (potential XSS attempt)
    if (trimmed.length > 0 && sanitized.length < trimmed.length * 0.5) {
        return {
            isValid: false,
            error: "Description contains invalid characters or HTML tags that are not allowed",
            sanitized,
        };
    }

    if (sanitized.length < 10) {
        return {
            isValid: false,
            error: "Description must be at least 10 characters long",
            sanitized,
        };
    }

    if (sanitized.length > 500) {
        return {
            isValid: false,
            error: "Description must be at most 500 characters long",
            sanitized,
        };
    }

    return { isValid: true, sanitized };
}


export function validateLink(link: string): ValidationResult {
    const sanitized = link.trim();

    // Basic URL pattern for http/https
    const urlPattern = /^https?:\/\/[^\s<>\"{}|\\^`\[\]]+$/i;

    if (!urlPattern.test(sanitized)) {
        return {
            isValid: false,
            error: "Link must be a valid URL starting with http:// or https://",
            sanitized,
        };
    }


    try {
        new URL(sanitized);
    } catch {
        return {
            isValid: false,
            error: "Link is not a valid URL format",
            sanitized,
        };
    }

    return { isValid: true, sanitized };
}


function sanitizeString(input: string): string {
    return input
        .trim()
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/\s+/g, " "); // Normalize whitespace
}


export function validateRecommendation(data: {
    title: string;
    blurb: string;
    link: string;
}): {
    isValid: boolean;
    error?: string;
    sanitized?: { title: string; blurb: string; link: string };
} {
    const titleResult = validateTitle(data.title);
    if (!titleResult.isValid) {
        return { isValid: false, error: titleResult.error };
    }

    const blurbResult = validateBlurb(data.blurb);
    if (!blurbResult.isValid) {
        return { isValid: false, error: blurbResult.error };
    }

    const linkResult = validateLink(data.link);
    if (!linkResult.isValid) {
        return { isValid: false, error: linkResult.error };
    }

    return {
        isValid: true,
        sanitized: {
            title: titleResult.sanitized,
            blurb: blurbResult.sanitized,
            link: linkResult.sanitized,
        },
    };
}
