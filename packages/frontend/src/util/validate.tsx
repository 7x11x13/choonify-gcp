import { UploadItem, UploadItemWithoutBlob, UploadSession } from "../types/upload";

export function validateTitle(value: string, allowTemplates: boolean): string | null {
    if (value.length === 0) {
        return 'Title cannot be empty';
    }
    if ((!allowTemplates && value.length > 100) || value.length > 10000) {
        return 'Title too long';
    }
    if (value.includes("<") || value.includes(">")) {
        return 'Title cannot contain < or > characters';
    }
    return null;
}

export function validateDescription(value: string, allowTemplates: boolean): string | null {
    if (value.includes("<") || value.includes(">")) {
        return 'Description cannot contain < or > characters';
    }
    if ((!allowTemplates && new Blob([value]).size > 5000) || value.length > 10000) {
        return 'Description too long';
    }
    return null;
}

export function validateTags(value: string[]): string | null {
    // https://developers.google.com/youtube/v3/docs/videos
    const prop = value.join(",").replace(" ", '" "');
    if (prop.length > 500) {
        return 'Too many tags'
    }
    return null;
}

export function validateItem(item: UploadItem | UploadItemWithoutBlob, allowTemplates: boolean): string | null {
    if (item.createdAt < Date.now() - 12 * 3600 * 1000) { // 12 hours ago = stale
        return "Stale session. Please reload page";
    }
    return validateTitle(item.metadata.title, allowTemplates) || validateDescription(item.metadata.description, allowTemplates) || validateTags(item.metadata.tags);
}

export function validateSession(session: UploadSession): string | null {
    for (const item of session.items) {
        const err = validateItem(item, false);
        if (err) {
            return err;
        }
    }
    return null;
}