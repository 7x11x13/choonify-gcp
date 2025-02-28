import { t } from "i18next";
import {
  UploadItem,
  UploadItemWithoutBlob,
  UploadSession,
} from "../types/upload";

export function validateTitle(
  value: string,
  allowTemplates: boolean,
): string | null {
  if (value.length === 0) {
    return t("validate.empty-title");
  }
  if ((!allowTemplates && value.length > 100) || value.length > 10000) {
    return t("validate.title-too-long");
  }
  if (value.includes("<") || value.includes(">")) {
    return t("validate.invalid-title");
  }
  return null;
}

export function validateDescription(
  value: string,
  allowTemplates: boolean,
): string | null {
  if (value.includes("<") || value.includes(">")) {
    return t("validate.invalid-description");
  }
  if (
    (!allowTemplates && new Blob([value]).size > 5000) ||
    value.length > 10000
  ) {
    return t("validate.description-too-long");
  }
  return null;
}

export function validateTags(value: string[]): string | null {
  // https://developers.google.com/youtube/v3/docs/videos
  const prop = value.join(",").replace(" ", '" "');
  if (prop.length > 500) {
    return t("validate.too-many-tags");
  }
  return null;
}

export function validateItem(
  item: UploadItem | UploadItemWithoutBlob,
  allowTemplates: boolean,
): string | null {
  if (item.createdAt < Date.now() - 12 * 3600 * 1000) {
    // 12 hours ago = stale
    return t("validate.stale-session");
  }
  return (
    validateTitle(item.metadata.title, allowTemplates) ||
    validateDescription(item.metadata.description, allowTemplates) ||
    validateTags(item.metadata.tags)
  );
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
