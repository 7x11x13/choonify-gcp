import { Center, Stack } from "@mantine/core";
import GoogleLoginButton from "../components/GoogleLoginButton";

export default function Home() {

    return (
        <Center>
            <Stack justify="center" gap="xs" ta="center">
                <h1>Choonify</h1>
                <GoogleLoginButton></GoogleLoginButton>
            </Stack>
        </Center>
    );
}