import { InputLabel, Progress, Stack, Text } from "@mantine/core";
import { useAuth } from "./Auth";
import { useTranslation } from "react-i18next";
import { realUploadedToday } from "../types/auth";
import { formatBytes } from "../util/format";
import config from "../config";

function getColorForProgress(prog: number) {
  if (prog < 50) {
    return "blue";
  }
  if (prog < 85) {
    return "orange";
  }
  return "red";
}

export default function QuotaMeter({ ...props }) {
  // display uploaded bytes today & quota
  const { userInfo } = useAuth();
  const { t } = useTranslation();

  if (!userInfo) {
    return;
  }

  const { uploadedBytes } = realUploadedToday(userInfo);
  const quota = config.const.UPLOAD_QUOTA_BYTES[userInfo.subscription];
  const progress = (uploadedBytes / quota) * 100;
  const color = getColorForProgress(progress);

  return (
    <Stack gap="0" {...props}>
      <InputLabel>{t("upload.quota.label")}</InputLabel>
      <Progress size="xl" value={progress} color={color}></Progress>
      <Text size="xs">
        {t("upload.quota.description", {
          current: formatBytes(uploadedBytes, 1),
          quota: formatBytes(quota, 1),
        })}
      </Text>
    </Stack>
  );
}
