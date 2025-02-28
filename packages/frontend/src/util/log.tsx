import { notifications } from "@mantine/notifications";
import { t } from "i18next";

export function displayError(message: React.ReactNode) {
  notifications.show({
    title: t("error"),
    message: message,
    color: "red",
  });
}

export function displaySuccess(message: React.ReactNode) {
  notifications.show({
    title: t("success"),
    message: message,
    color: "green",
  });
}
