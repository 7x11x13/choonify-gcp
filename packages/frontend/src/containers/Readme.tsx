import { Center, Container, TypographyStylesProvider } from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import TemplateStringPlayground from "../components/TemplateStringPlayground";
import { useEffect } from "react";
import { useHashLocation } from "wouter/use-hash-location";

export default function Readme({ namespace }: { namespace: string }) {
  const { t } = useTranslation(namespace);
  const [hash, _] = useHashLocation();

  useEffect(() => {
    const id = hash.substring(1);
    if (id) {
      const elem = document.getElementById(id);
      elem?.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);

  return (
    <Center>
      <Container size="md" my="xl" py="xl">
        <TypographyStylesProvider>
          <Trans
            t={t}
            i18nKey={namespace}
            components={{
              h1: <h1 />,
              h2: <h2 />,
              h3: <h3 />,
              h4: <h4 />,
              h5: <h5 />,
              h6: <h6 />,
              a: <a target="_blank" style={{ wordBreak: "break-all" }} />,
              aself: <a />,
              code: <code />,
              ul: <ul />,
              li: <li />,
              TemplateStringPlayground: <TemplateStringPlayground />,
            }}
          />
        </TypographyStylesProvider>
      </Container>
    </Center>
  );
}
