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
      <script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1224341527846653"
        crossOrigin="anonymous"
      ></script>
      <Stack>
        <Group
          grow
          preventGrowOverflow={false}
          align="start"
          wrap="nowrap"
          gap="xs"
        >
          <AdContainer
            name="sidebar-left"
            miw={160}
            w={160}
            h={600}
            visibleFrom="md"
          />
          {children}
          <AdContainer
            name="sidebar-right"
            miw={160}
            w={160}
            h={600}
            visibleFrom="md"
          />
        </Group>
        <Center>
          <AdContainer
            name="bottom-desktop"
            mt="xl"
            miw={728}
            w={728}
            h={90}
            visibleFrom="md"
          />
          <AdContainer
            name="bottom-mobile"
            mt="xl"
            miw={300}
            w={300}
            h={250}
            hiddenFrom="md"
          />
        </Center>
      </Stack>
      <Affix position={{ bottom: 0 }} w="100%">
        <AdContainer
          name="overlay-mobile"
          miw={300}
          w="100%"
          mih={50}
          h={50}
          hiddenFrom="md"
        />
      </Affix>
    </>
  );
}
