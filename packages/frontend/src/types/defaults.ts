import { randomId } from "@mantine/hooks";
import { ChoonifyUserInfo, UserSettings } from "./auth";
import { FilterType, UploadItem } from "./upload";
import { defaultImageB64, defaultImageType } from "./default-image";
import config from "../config";

function b64toBlobParts(b64Data: string, sliceSize: number = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return byteArrays;
}

export function getDefaultImageFile(): File {
    return new File(b64toBlobParts(defaultImageB64), "default-image", {
        type: defaultImageType
    });
}

export function getDefaultUploadItem(): UploadItem {
    const defaultImage = getDefaultImageFile();
    return {
        id: randomId(),
        createdAt: 0,
        originalAudioFileName: "",
        audioFile: "",
        audioFileLength: 0,
        audioFileSize: 0,
        imageFile: config.settings.DEFAULT_COVER_IMAGE,
        imageFileBlob: defaultImage,
        imageFileSize: defaultImage.size,
        metadata: {
            title: "{{@if(it.metadata.title && it.metadata.artist)}}\n    {{_ it.metadata.artist}} - {{it.metadata.title}}\n{{ #else }}\n    {{_ it.file.name}}\n{{/if}}",
            description: "Uploaded with https://choonify.com",
            tags: ["choonify"],
            categoryId: "10",
            madeForKids: false,
            visibility: "public",
            notifySubscribers: true,
        },
        settings: {
            filterType: FilterType.BLACK_BACKGROUND,
            watermark: true,
            backgroundColor: "#000000"
        }
    }
}

export function getDefaultUserSettings(): UserSettings {
    return {
        defaults: getDefaultUploadItem(),
        defaultChannelId: "",
    }
}

export function getDefaultUserInfo(): ChoonifyUserInfo {
    return {
        subscription: 0,
        customerId: "",
        uploadedToday: 0,
        uploadedBytesToday: 0,
        uploadedAllTime: 0,
        uploadedBytesAllTime: 0,
        lastUploaded: 0,
        channels: [],
        settings: getDefaultUserSettings(),
    }
}