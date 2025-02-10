import { notifications } from "@mantine/notifications";

export function displayError(message: string) {
    notifications.show({
        title: 'Error',
        message: message,
        color: 'red',
    });
}