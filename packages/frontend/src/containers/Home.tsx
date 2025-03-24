import { Center, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import GoogleLoginButton from "../components/GoogleLoginButton";

export default function Home() {
  const { t } = useTranslation();

  return (
    <Center>
      <Stack justify="center" gap="0" ta="center" align="center">
        <Title>Choonify</Title>
        <Text mb="lg">{t("slogan")}</Text>
        <GoogleLoginButton></GoogleLoginButton>
        {/* TODO: demo video embed */}
      </Stack>
    </Center>
  );
}
