import { Center, Container, Loader } from "@mantine/core";
import UploadForm from "../components/UploadForm";
import { useEffect, useState } from "react";
import { ChoonifyUserInfo } from "../types/auth";
import { UploadItem } from "../types/upload";
import { apiGet, apiPost, downloadFile } from "../util/aws";
import { notifications } from "@mantine/notifications";
import { getDefaultImageFile } from "../util/metadata";
import config from "../config";

export default function Settings() {
    const [info, setInfo] = useState<ChoonifyUserInfo | null>(null);
    const [sending, setSending] = useState(false);

    async function updateSettings(settings: UploadItem) {
        setSending(true);
        if (await apiPost("/settings", settings) !== undefined) {
            notifications.show(
                {
                    title: "Success",
                    message: "Settings changed"
                }
            )
        }
        setSending(false);
    }

    async function loadUser() {
        const data = await apiGet("/me");
        if (data !== undefined) {
            // download default image if needed
            const userInfo = data as ChoonifyUserInfo;
            if (userInfo.defaults.imageFile === config.settings.DEFAULT_COVER_IMAGE || !userInfo.defaults.imageFile) {
                userInfo.defaults.imageFile = config.settings.DEFAULT_COVER_IMAGE;
                userInfo.defaults.imageFileBlob = getDefaultImageFile();
            } else {
                // fetch from s3
                userInfo.defaults.imageFileBlob = await downloadFile(userInfo.defaults.imageFile, () => { });
            }
            setInfo(userInfo);
        }
    }

    useEffect(() => {
        loadUser();
    }, []);

    if (!info) {
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
            <UploadForm settingsMode="defaults" disabled={sending} initialItemData={info.defaults} formCallback={updateSettings} />
        </Container>
    );
}