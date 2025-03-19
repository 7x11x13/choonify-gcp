import { Affix, Center, Group, Stack } from "@mantine/core";
import { ReactElement } from "react";
import AdContainer from "./AdContainer";
import { useAuth } from "./Auth";
import Loading from "./Loading";

import "@mantine/core/styles/Affix.css";
import config from "../config";

export default function AdWrap({ children }: { children: ReactElement }) {
  const { loading, userInfo } = useAuth();

  if (!config.ads.ENABLED) {
    return children;
  }

  if (loading) {
    return <Loading />;
  }

  if (userInfo && userInfo.subscription > 0) {
    return children;
  }

  return (
    <>
      <Stack>
        <Group
          grow
          preventGrowOverflow={false}
          align="start"
          wrap="nowrap"
          gap="xs"
        >
          <AdContainer miw={160} w={160} h={600} visibleFrom="md" />
          {children}
          <AdContainer miw={160} w={160} h={600} visibleFrom="md" />
        </Group>
        <Center>
          <AdContainer mt="xl" miw={728} w={728} h={90} visibleFrom="md" />
          <AdContainer mt="xl" miw={300} w={300} h={250} hiddenFrom="md" />
        </Center>
      </Stack>
      <Affix position={{ bottom: 0 }} w="100%">
        <AdContainer miw={300} w="100%" mih={50} h={50} hiddenFrom="md" />
      </Affix>
    </>
  );
}
