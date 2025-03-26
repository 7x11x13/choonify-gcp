import { Box, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import GoogleLoginButton from "../components/GoogleLoginButton";

export default function Home() {
  const { t } = useTranslation();

  return (
    <Stack justify="center" gap="0" ta="center" align="center">
      <Title>Choonify</Title>
      <Text mb="lg">{t("slogan")}</Text>
      <GoogleLoginButton></GoogleLoginButton>
      <Box w="100%" maw="900px" mt="50px">
        <Box
          pos="relative"
          w="100%"
          pb="56.25%" // 9/16 * 100% for 16:9 aspect ratio
        >
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube-nocookie.com/embed/H24rG_eNp5U?si=LYASN6GiTbAPQzqT&cc_load_policy=1&rel=0"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              border: 0,
            }}
          />
        </Box>
      </Box>
    </Stack>
  );
}
