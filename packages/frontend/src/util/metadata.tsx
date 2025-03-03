import type { FileWithPath } from "@mantine/dropzone";
import { randomId } from "@mantine/hooks";
import { IAudioMetadata, parseBlob } from "music-metadata";
import { ChoonifyUserInfo } from "../types/auth";

import { getDefaultUploadItem } from "../types/defaults";
import { uploadFile } from "./api";
import { displayError } from "./log";
import { t } from "i18next";
import { TemplateStringInput } from "../types/template";

export async function getFileMetadata(
  file: FileWithPath,
): Promise<IAudioMetadata | null> {
  try {
    const metadata = await parseBlob(file, {
      duration: true,
    });
    return metadata;
  } catch (err: any) {
    console.error(err);
    displayError(err.toString());
    return null;
  }
}

export async function getTemplateStringInput(
  file: FileWithPath,
  metadata: IAudioMetadata,
) {
  return {
    metadata: metadata.common,
    format: metadata.format,
    file,
  };
}

async function renderTemplateString(
  template: string,
  input: TemplateStringInput,
): Promise<string> {
  try {
    const { Eta } = await import("eta");
    const eta = new Eta();
    return eta.renderString(template, input);
  } catch (err: any) {
    console.error(err);
    displayError("Invalid template string");
    return "N/A";
  }
}

export async function getUploadItemFromFile(
  user: ChoonifyUserInfo,
  file: FileWithPath,
  onProg: (percent: number) => void,
  maxSizeBytes: number,
) {
  if (maxSizeBytes <= 0) {
    displayError(t("api.presign.out-of-storage"));
    return null;
  }

  const metadata = await getFileMetadata(file);
  if (!metadata) {
    return null;
  }
  const item = getDefaultUploadItem();
  item.id = randomId();
  item.createdAt = Date.now();
  item.originalAudioFileName = file.name;
  item.audioFileSize = file.size;

  if (item.audioFileSize + item.imageFileSize > maxSizeBytes) {
    console.error(
      `File too big: ${item.audioFileSize + item.imageFileSize} > ${maxSizeBytes}`,
    );
    displayError(t("api.presign.out-of-storage"));
    return null;
  }

  if (metadata.format.duration === undefined) {
    console.error(`Could not determine length of file: ${file}`);
    displayError(t("metadata.file-length-error", { name: file.name }));
    return null;
  }
  item.audioFileLength = metadata.format.duration;

  const defaultItem = user.settings.defaults;
  item.imageFile = defaultItem.imageFile;
  item.imageFileBlob = defaultItem.imageFileBlob;
  item.imageFileSize = defaultItem.imageFileSize;
  item.metadata = {
    ...item.metadata,
    ...defaultItem.metadata,
  };
  item.settings = {
    ...item.settings,
    ...defaultItem.settings,
  };
  const templateInput = await getTemplateStringInput(file, metadata);
  item.metadata.title = await renderTemplateString(
    item.metadata.title,
    templateInput,
  );
  item.metadata.description = await renderTemplateString(
    item.metadata.description,
    templateInput,
  );
  item.metadata.tags.push(...(metadata.common.genre ?? []));

  // Use embedded cover art as image
  if (metadata.common.picture) {
    function onImageProg(percent: number) {
      onProg(percent / 2);
    }
    const picture = metadata.common.picture[0];

    if (item.audioFileSize + picture.data.length > maxSizeBytes) {
      console.error(
        `File too big: ${item.audioFileSize + picture.data.length} > ${maxSizeBytes}`,
      );
      displayError(t("api.presign.out-of-storage"));
      return null;
    }

    const imagePath = await uploadFile(
      picture.data,
      picture.format,
      picture.data.byteLength,
      picture.name ?? `cover.${picture.format.split("/").at(-1)}`,
      onImageProg,
    );
    if (imagePath === null) {
      return null;
    }
    item.imageFile = imagePath;
    item.imageFileBlob = new File(
      [picture.data],
      item.imageFile.split("/").at(-1)!,
      { type: picture.format },
    );
    item.imageFileSize = item.imageFileBlob.size;
  }
  onProg(50);
  // Upload audio file to s3
  function onAudioProg(percent: number) {
    onProg(50 + percent / 2);
  }
  const audioPath = await uploadFile(
    file,
    file.type,
    file.size,
    file.name,
    onAudioProg,
  );
  if (audioPath === null) {
    return null;
  }
  item.audioFile = audioPath;
  return item;
}
