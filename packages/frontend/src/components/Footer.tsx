import { Anchor, Divider, Group, Space, Stack, Text } from "@mantine/core";
import { preload } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

export default function Footer() {
  const { t, i18n } = useTranslation();
  return (
    <Stack gap="lg">
      <Divider />
      <Group justify="center" mb="xl" gap="xs">
        <Link to="/terms" asChild>
          <Anchor
            onMouseOver={() => {
              import("../containers/Readme.tsx");
              preload(`/locales/${i18n.language}/terms.json5`, {
                as: "fetch",
                crossOrigin: "anonymous",
              });
            }}
          >
            {t("terms-of-service")}
          </Anchor>
        </Link>
        <Text c="dimmed">|</Text>
        <Link to="/privacy" asChild>
          <Anchor
            onMouseOver={() => {
              import("../containers/Readme.tsx");
              preload(`/locales/${i18n.language}/privacy.json5`, {
                as: "fetch",
                crossOrigin: "anonymous",
              });
            }}
          >
            {t("privacy-policy")}
          </Anchor>
        </Link>
      </Group>
      <Space />
    </Stack>
  );
}
