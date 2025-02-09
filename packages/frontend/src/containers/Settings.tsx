import { Center, Container, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useAuth } from "../components/Auth";
import UploadForm from "../components/UploadForm";
import { UserSettings } from "../types/auth";
import { apiPost } from "../util/aws";

export default function Settings() {
    const { userInfo, refreshUserInfo } = useAuth();
    const [sending, setSending] = useState(false);

    async function updateSettings(settings: UserSettings) {
        setSending(true);
        const { imageFileBlob: _, ...defaultsWithoutBlob } = settings.defaults;
        const settingsWithoutBlob = { ...settings, defaults: defaultsWithoutBlob };
        if (await apiPost("/settings", settingsWithoutBlob) !== undefined) {
            await refreshUserInfo();
            notifications.show(
                {
                    title: "Success",
                    message: "Settings changed"
                }
            )
        }
        setSending(false);
    }

    if (!userInfo) {
        return (
            <Center>
                <Loader role="status">
                    <span className="visually-hidden">Loading...</span>
                </Loader>
            </Center>
        )
    }
    // TODO: display user upload stats
    return (
        <Container title="User settings">
            <UploadForm settingsMode="defaults" disabled={sending} initialItemData={userInfo.settings} formCallback={updateSettings} />
        </Container>
    );
}