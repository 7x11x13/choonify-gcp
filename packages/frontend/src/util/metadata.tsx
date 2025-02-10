import type { FileWithPath } from "@mantine/dropzone";
import { randomId } from "@mantine/hooks";
import { IAudioMetadata, parseBlob } from "music-metadata";
import { ChoonifyUserInfo } from "../types/auth";

import { notifications } from "@mantine/notifications";
import { render } from "squirrelly";
import { uploadFile } from "./aws";
import { getDefaultUploadItem } from "../types/defaults";

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

function renderTemplateString(template: string, file: FileWithPath, metadata: IAudioMetadata): string {
    return render(template, { metadata: metadata.common, format: metadata.format, file: file });
}


export async function getUploadItemFromFile(user: ChoonifyUserInfo, file: FileWithPath, onProg: (percent: number) => void) {
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

    const defaultItem = user.settings.defaults;
    item.imageFile = defaultItem.imageFile;
    item.imageFileBlob = defaultItem.imageFileBlob;
    item.metadata = {
        ...item.metadata, ...(defaultItem.metadata)
    }
    item.settings = {
        ...item.settings, ...(defaultItem.settings)
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
        if (imagePath === null) {
            return null;
        }
        item.imageFile = imagePath;
        item.imageFileBlob = new File([picture.data], item.imageFile.split("/").at(-1)!, { type: picture.format });
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