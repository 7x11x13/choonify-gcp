import { notifications } from "@mantine/notifications";
import { t } from "i18next";

export function firebaseErrorToString(err: any): string {
  if (err.message) {
    const match = (err.message as string).match(/"message":"([^"]+)"/);
    if (match) {
      return t(match[1]);
    }
    return err.message;
  }
  return err.toString();
}

export function displayError(message: React.ReactNode) {
  console.log("Error: " + JSON.stringify(message));
  notifications.show({
    title: t("error"),
    message: message,
    color: "red",
    autoClose: 10000,
  });
}

export function displaySuccess(message: React.ReactNode) {
  console.log("Success: " + JSON.stringify(message));
  notifications.show({
    title: t("success"),
    message: message,
    color: "green",
  });
}
