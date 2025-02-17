import { Container } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../components/Auth";
import UploadForm from "../components/UploadForm";
import { UserSettings } from "../types/auth";
import { apiPost } from "../util/api";
import { displaySuccess } from "../util/log";

export default function Settings() {
    const { userInfo, refreshUserInfo } = useAuth();
    const [sending, setSending] = useState(false);
    const { t } = useTranslation();

    async function updateSettings(settings: UserSettings) {
        setSending(true);
        const { imageFileBlob: _, ...defaultsWithoutBlob } = settings.defaults;
        const settingsWithoutBlob = { ...settings, defaults: defaultsWithoutBlob };
        if (await apiPost("/settings", settingsWithoutBlob) !== undefined) {
            await refreshUserInfo();
            displaySuccess(t('settings.settings-changed'));
        }
        setSending(false);
    }
    // if (!userInfo) {
    //     return (
    //         <Center>
    //             <Loader role="status"></Loader>
    //         </Center>
    //     )
    // }
    // TODO: display user upload stats
    return (
        <Container title={t('settings.label')}>
            <UploadForm settingsMode="defaults" disabled={sending} initialItemData={userInfo!.settings} formCallback={updateSettings} />
        </Container>
    );
}