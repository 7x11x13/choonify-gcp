import { Affix, Group } from "@mantine/core";
import { ReactElement } from "react";
import AdContainer from "./AdContainer";
import { useAuth } from "./Auth";
import Loading from "./Loading";

import "@mantine/core/styles/Affix.css";

export default function AdWrap({ children }: { children: ReactElement }) {
  const { loading, userInfo } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (userInfo && userInfo.subscription > 0) {
    return children;
  }

  return (
    <>
      <Group
        grow
        preventGrowOverflow={false}
        align="stretch"
        wrap="nowrap"
        gap="xs"
      >
        <AdContainer miw={160} w={160} h={600} visibleFrom="md" />
        {children}
        <AdContainer miw={160} w={160} h={600} visibleFrom="md" />
      </Group>
      <Affix position={{ bottom: 0 }} w="100%">
        <AdContainer miw={300} w="100%" mih={50} h={50} hiddenFrom="md" />
      </Affix>
    </>
  );
}
