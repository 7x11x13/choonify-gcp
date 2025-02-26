import { t } from "i18next";

export function formatBytes(bytes: number, decimals = 1): string {
    const k = 1000;
    const sizes = [t('format.units.b'), t('format.units.kb'), t('format.units.mb'), t('format.units.gb'), t('format.units.tb')];
    if (bytes === 0) return t("format.bytes", { value: (0).toFixed(decimals), unit: sizes[0] });

    const i = Math.min(Math.floor(Math.log2(bytes) / Math.log2(k)), sizes.length - 1);

    return t("format.bytes", { value: (bytes / Math.pow(k, i)).toFixed(decimals), unit: sizes[i] });
}

export function formatDuration(seconds: number): string {
    return new Date(1000 * seconds).toISOString().substring(11, 19);
}