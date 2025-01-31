export function formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 B';

    const k = 1000;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.min(Math.floor(Math.log2(bytes) / Math.log2(k)), sizes.length - 1);

    return (bytes / Math.pow(k, i)).toFixed(decimals) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
    return new Date(1000 * seconds).toISOString().substring(11, 19);
}