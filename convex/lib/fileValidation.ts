export interface FileValidationResult {
    isValid: boolean;
    error?: string;
}

export interface ImageValidationResult extends FileValidationResult {
    width?: number;
    height?: number;
}

export const FILE_VALIDATION = {
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    MAX_IMAGE_DIMENSION: 4096,
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
    ] as const,
    ALLOWED_EXTENSIONS: [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif'
    ] as const,
} as const;

export interface FileValidationResult {
    isValid: boolean;
    error?: string;
}

export interface ImageValidationResult extends FileValidationResult {
    width?: number;
    height?: number;
}

export function validateFileSize(fileSize: number): FileValidationResult {
    if (fileSize <= 0) {
        return {
            isValid: false,
            error: "Invalid file size"
        };
    }

    if (fileSize > FILE_VALIDATION.MAX_FILE_SIZE) {
        const maxSizeMB = FILE_VALIDATION.MAX_FILE_SIZE / (1024 * 1024);
        return {
            isValid: false,
            error: `File size exceeds ${maxSizeMB}MB limit`
        };
    }

    return { isValid: true };
}

export function validateMimeType(mimeType: string): FileValidationResult {
    if (!mimeType) {
        return {
            isValid: false,
            error: "Missing file type"
        };
    }

    const normalizedMimeType = mimeType.toLowerCase();

    if (!FILE_VALIDATION.ALLOWED_MIME_TYPES.includes(normalizedMimeType as any)) {
        return {
            isValid: false,
            error: `Invalid file type. Allowed types: ${FILE_VALIDATION.ALLOWED_MIME_TYPES.join(', ')}`
        };
    }

    return { isValid: true };
}

export function validateFileExtension(fileName: string): FileValidationResult {
    if (!fileName) {
        return {
            isValid: false,
            error: "Missing filename"
        };
    }

    const extension = fileName.split('.').pop()?.toLowerCase();

    if (!extension) {
        return {
            isValid: false,
            error: "Missing file extension"
        };
    }

    if (!FILE_VALIDATION.ALLOWED_EXTENSIONS.includes(extension as any)) {
        return {
            isValid: false,
            error: `Invalid file extension. Allowed: ${FILE_VALIDATION.ALLOWED_EXTENSIONS.join(', ')}`
        };
    }

    return { isValid: true };
}

export function validateImageDimensions(
    width: number,
    height: number
): ImageValidationResult {
    if (width <= 0 || height <= 0) {
        return {
            isValid: false,
            error: "Invalid image dimensions"
        };
    }

    const maxDim = FILE_VALIDATION.MAX_IMAGE_DIMENSION;

    if (width > maxDim || height > maxDim) {
        return {
            isValid: false,
            error: `Image dimensions exceed ${maxDim}x${maxDim} pixels`,
            width,
            height
        };
    }

    return {
        isValid: true,
        width,
        height
    };
}


export function validateFile(
    fileName: string,
    fileSize: number,
    mimeType: string
): FileValidationResult {
    // Validate file size
    const sizeResult = validateFileSize(fileSize);
    if (!sizeResult.isValid) {
        return sizeResult;
    }

    // Validate MIME type
    const mimeResult = validateMimeType(mimeType);
    if (!mimeResult.isValid) {
        return mimeResult;
    }

    // Validate file extension
    const extensionResult = validateFileExtension(fileName);
    if (!extensionResult.isValid) {
        return extensionResult;
    }

    // Check MIME type and extension match (prevent spoofing)
    const extension = fileName.split('.').pop()?.toLowerCase();
    const expectedMimeTypes = getExpectedMimeTypes(extension || '');

    if (!expectedMimeTypes.includes(mimeType.toLowerCase())) {
        return {
            isValid: false,
            error: "File type mismatch - possible file spoofing detected"
        };
    }

    return { isValid: true };
}

/**
 * Get expected MIME types for a file extension
 */
function getExpectedMimeTypes(extension: string): string[] {
    const mimeMap: Record<string, string[]> = {
        'jpg': ['image/jpeg'],
        'jpeg': ['image/jpeg'],
        'png': ['image/png'],
        'webp': ['image/webp'],
        'gif': ['image/gif']
    };

    return mimeMap[extension.toLowerCase()] || [];
}

export function sanitizeFileName(fileName: string): string {
    return fileName
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .replace(/^\.+/, '')
        .substring(0, 255);
}
