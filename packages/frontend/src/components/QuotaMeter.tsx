import { InputLabel, Progress, Stack, Text } from '@mantine/core';
import { useAuth } from './Auth';
import { useTranslation } from "react-i18next";
import { realUploadedToday } from '../types/auth';
import { formatBytes } from '../util/format';

const byteQuotas = [
    100 * 1000 * 1000, // 100 MB
    500 * 1000 * 1000, // 500 MB
    5 * 1000 * 1000 * 1000, // 5 GB
    50 * 1000 * 1000 * 1000 // 50 GB
];

function getColorForProgress(prog: number) {
    if (prog < 50) {
        return "blue";
    }
    if (prog < 85) {
        return "orange";
    }
    return "red"
}

export default function QuotaMeter() {
    // display uploaded bytes today & quota
    const { userInfo } = useAuth();
    const { t } = useTranslation();

    if (!userInfo) {
        return;
    }

    const { uploadedBytes } = realUploadedToday(userInfo);
    const quota = byteQuotas[userInfo.subscription];
    const progress = uploadedBytes / quota * 100;
    const color = getColorForProgress(progress);

    return <Stack gap="0">
        <InputLabel>{t('upload.quota.label')}</InputLabel>
        <Progress size="xl" value={progress} color={color}></Progress>
        <Text size="xs">{t('upload.quota.description', { current: formatBytes(uploadedBytes, 1), quota: formatBytes(quota, 1) })}</Text>
    </Stack>
}