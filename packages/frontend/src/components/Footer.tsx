import { Anchor, Divider, Group, Space, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <Stack gap="lg">
      <Divider />
      <Group justify="center" mb="xl" gap="xs">
        <Anchor href="/terms">{t("terms-of-service")}</Anchor>
        <Text c="dimmed">|</Text>
        <Anchor href="/privacy">{t("privacy-policy")}</Anchor>
      </Group>
      <Space />
    </Stack>
  );
}
