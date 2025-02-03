import { Center, Container, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { useAuth } from "../components/Auth";
import UploadForm from "../components/UploadForm";
import config from "../config";
import { UserSettings } from "../types/auth";
import { UploadItem } from "../types/upload";
import { apiPost, downloadFile } from "../util/aws";
import { getDefaultImageFile } from "../util/metadata";

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

    async function updateDefaults(defaults: UploadItem) {
        const settings = { ...userInfo!.settings, defaults };
        await updateSettings(settings);
    }

    async function loadUser() {
        if (!userInfo) {
            return;
        }
        const defaults = userInfo.settings.defaults;
        // download default image if needed
        if (defaults.imageFile === config.settings.DEFAULT_COVER_IMAGE || !defaults.imageFile) {
            defaults.imageFile = config.settings.DEFAULT_COVER_IMAGE;
            defaults.imageFileBlob = getDefaultImageFile();
        } else {
            // fetch from s3
            defaults.imageFileBlob = await downloadFile(defaults.imageFile, () => { });
        }
    }

    useEffect(() => {
        loadUser();
    }, []);

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
            <UploadForm settingsMode="defaults" disabled={sending} initialItemData={userInfo.settings.defaults} formCallback={updateDefaults} />
        </Container>
    );
}