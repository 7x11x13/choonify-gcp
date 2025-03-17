import { Center, Stack, Text, Title } from "@mantine/core";
import GoogleLoginButton from "../components/GoogleLoginButton";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <Center>
      <Stack justify="center" gap="0" ta="center" align="center">
        <Title>Choonify</Title>
        <Text mb="lg">{t("slogan")}</Text>
        <GoogleLoginButton></GoogleLoginButton>
      </Stack>
    </Center>
  );
}
