import { t } from "i18next";

export function formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 B';

    const k = 1000;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB']; // TODO: localization?

    const i = Math.min(Math.floor(Math.log2(bytes) / Math.log2(k)), sizes.length - 1);

    return t("format.bytes", { value: bytes / Math.pow(k, i), unit: sizes[i], maximumFractionDigits: decimals });
}

export function formatDuration(seconds: number): string {
    return new Date(1000 * seconds).toISOString().substring(11, 19);
}