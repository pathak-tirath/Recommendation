export interface ValidationResult {
    isValid: boolean;
    error?: string;
    sanitized: string;
}

export interface FileValidationResult {
    isValid: boolean;
    error?: string;
}

export interface ImageValidationResult extends FileValidationResult {
    width?: number;
    height?: number;
}
