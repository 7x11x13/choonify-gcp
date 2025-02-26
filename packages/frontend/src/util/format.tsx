import i18n from "../i18n";

export function formatBytes(bytes: number, decimals = 1): string {
    const t = i18n.t;
    const locale = i18n.language;
    const k = 1000;
    const sizes = [t('format.units.b'), t('format.units.kb'), t('format.units.mb'), t('format.units.gb'), t('format.units.tb')];

    function toFixedi18n(val: number, decimals: number) {
        return val.toLocaleString(locale, { maximumFractionDigits: decimals })
    }

    if (bytes === 0) return t("format.bytes", { value: "0", unit: sizes[0] });

    const i = Math.min(Math.floor(Math.log2(bytes) / Math.log2(k)), sizes.length - 1);

    return t("format.bytes", { value: toFixedi18n(bytes / Math.pow(k, i), decimals), unit: sizes[i] });
}

export function formatDuration(seconds: number): string {
    return new Date(1000 * seconds).toISOString().substring(11, 19);
}