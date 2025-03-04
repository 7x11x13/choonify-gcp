import { Anchor, Divider, Group, Space, Stack, Text } from "@mantine/core";

export default function Footer() {
  return (
    <Stack gap="lg">
      <Divider />
      <Group justify="center" mb="xl" gap="xs">
        <Anchor href="/terms">Terms of Service</Anchor>
        <Text c="dimmed">|</Text>
        <Anchor href="/privacy">Privacy Policy</Anchor>
      </Group>
      <Space />
    </Stack>
  );
}
