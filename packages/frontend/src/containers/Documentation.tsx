import Markdown from "markdown-to-jsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { displayError } from "../util/log";
import { Center, Container, TypographyStylesProvider } from "@mantine/core";

export default function Documentation() {
  const { t, i18n } = useTranslation();
  const [mdString, setMdString] = useState("");

  async function fetchMdString() {
    const res = await fetch(`/locales/${i18n.language}/Documentation.md`);
    if (res.ok) {
      setMdString(await res.text());
    } else {
      displayError(`(${res.status}) ${t("api.unknown")}`);
    }
  }

  useEffect(() => {
    fetchMdString();
  }, [i18n.language]);

  if (mdString === "") {
    return;
  }

  return (
    <Center>
      <Container size="md" my="xl">
        <TypographyStylesProvider>
          <Markdown children={mdString} />
        </TypographyStylesProvider>
      </Container>
    </Center>
  );
}
