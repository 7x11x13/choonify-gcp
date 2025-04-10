import { Button } from "@mantine/core";
import { useAuth } from "./Auth";
import { GoogleIcon } from "./GoogleIcon";
import { useTranslation } from "react-i18next";

export default function GoogleLoginButton({ props }: any) {
  const { user, signIn } = useAuth();
  const { t } = useTranslation();
  return (
    <Button
      {...props}
      onClick={signIn}
      disabled={user !== null}
      leftSection={<GoogleIcon />}
      variant="default"
    >
      {t("login_button.login-with-google")}
    </Button>
  );
}
