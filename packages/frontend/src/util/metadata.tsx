import type { FileWithPath } from "@mantine/dropzone";
import { IAudioMetadata, parseBlob } from "music-metadata";
import { ChoonifyUserInfo } from "../types/auth";
import { FilterType, UploadItem } from "../types/upload";
import { randomId } from "@mantine/hooks";

import { render } from "squirrelly";
import { apiGet, downloadFile, uploadFile } from "./aws";
import { notifications } from "@mantine/notifications";
import { defaultImageB64, defaultImageType } from "../types/default-image";
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
    return {
        id: randomId(),
        originalAudioFileName: "",
        audioFile: "",
        audioFileLength: 0,
        audioFileSize: 0,
        imageFile: "",
        imageFileBlob: null,
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

async function getFileMetadata(file: FileWithPath) {
    try {
        const metadata = await parseBlob(file, {
            duration: true
        });
        return metadata;
    } catch (err: any) {
        console.error(err);
        notifications.show({
            title: 'Error',
            message: err.toString(),
        });
        return null;
    }
}

async function getUserDefault(): Promise<UploadItem | null> {
    const data = await apiGet("/me");
    if (data !== undefined) {
        return (data as ChoonifyUserInfo).defaults;
    }
    return null;
}

function renderTemplateString(template: string, file: FileWithPath, metadata: IAudioMetadata): string {
    return render(template, { metadata: metadata.common, format: metadata.format, file: file });
}


export async function getUploadItemFromFile(file: FileWithPath, onProg: (percent: number) => void) {
    const metadata = await getFileMetadata(file);
    if (!metadata) {
        return null;
    }
    const item = getDefaultUploadItem();
    item.id = randomId();
    item.originalAudioFileName = file.name;
    item.audioFileSize = file.size;

    if (metadata.format.duration === undefined) {
        console.error(`Could not determine length of file: ${file}`);
        notifications.show({
            title: "Error",
            message: `Could not determine length of file: ${file.name}`,
            color: "red",
        })
        return null;
    }
    item.audioFileLength = metadata.format.duration;

    const defaultItem = await getUserDefault();
    item.metadata = {
        ...item.metadata, ...(defaultItem?.metadata || {})
    }
    item.settings = {
        ...item.settings, ...(defaultItem?.settings || {})
    }
    item.metadata.title = renderTemplateString(item.metadata.title, file, metadata);
    item.metadata.description = renderTemplateString(item.metadata.description, file, metadata);
    item.metadata.tags.push(...(metadata.common.genre ?? []));

    // Use embedded cover art as image
    if (metadata.common.picture) {
        function onImageProg(percent: number) {
            onProg(percent / 2);
        }
        const picture = metadata.common.picture[0];
        const imagePath = await uploadFile(picture.data, picture.format, picture.data.byteLength, picture.name ?? `cover.${picture.format.split("/").at(-1)}`, onImageProg);
        item.imageFile = imagePath;
        item.imageFileBlob = new File([picture.data], item.imageFile.split("/").at(-1)!, { type: picture.format });
    }
    if (item.imageFile === "") {
        if (defaultItem?.imageFile === config.settings.DEFAULT_COVER_IMAGE || !defaultItem) {
            item.imageFile = config.settings.DEFAULT_COVER_IMAGE;
            item.imageFileBlob = getDefaultImageFile();
        } else {
            // fetch from s3
            item.imageFile = defaultItem?.imageFile;
            item.imageFileBlob = await downloadFile(item.imageFile, (percent) => {
                onProg(percent / 2);
            });
        }
    }
    onProg(50);
    // Upload audio file to s3
    function onAudioProg(percent: number) {
        onProg(50 + percent / 2);
    }
    const audioPath = await uploadFile(file, file.type, file.size, file.name, onAudioProg);
    if (audioPath === null) {
        return null;
    }
    item.audioFile = audioPath;
    return item;
}