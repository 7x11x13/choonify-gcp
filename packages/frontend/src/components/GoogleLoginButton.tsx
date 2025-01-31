import { Button } from "@mantine/core";
import { useAuth } from './Auth';
import { GoogleIcon } from "./GoogleIcon";


export default function GoogleLoginButton() {
    const { user, signIn } = useAuth();
    return (
        <Button onClick={signIn} disabled={user !== null} leftSection={<GoogleIcon />} variant="default">Login with Google</Button>
    )
}