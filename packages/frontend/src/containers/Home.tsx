import { Center, Stack, Text, Title } from "@mantine/core";
import GoogleLoginButton from "../components/GoogleLoginButton";

export default function Home() {
  return (
    <Center>
      <Stack justify="center" gap="0" ta="center" align="center">
        <Title>Choonify</Title>
        <Text mb="lg">Upload songs to YouTube in under a minute</Text>
        <GoogleLoginButton></GoogleLoginButton>
      </Stack>
    </Center>
  );
}
