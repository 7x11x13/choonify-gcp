import { FileInput, Progress } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { useState } from "react";
import { UserSettings } from "../types/auth";
import { uploadFile } from "../util/api";
import config from "../config";
import { displayError } from "../util/log";
import { useTranslation } from "react-i18next";

export function CoverArtInput({
  form,
  ...others
}: {
  form: UseFormReturnType<UserSettings, (values: UserSettings) => UserSettings>;
}) {
  const [uploadProgress, setUploadProgress] = useState(100);
  const { t } = useTranslation();

  async function onFileChange(file: File | null) {
    if (!file) {
      return;
    }
    if (config.const.DISALLOWED_IMG_MIMETYPES.includes(file.type)) {
      displayError(
        t("api.settings.unsupported-image-type", { imgType: file.type }),
      );
      return;
    }
    if (file.size > config.const.MAX_IMAGE_SIZE_BYTES) {
      displayError(t("api.settings.image-too-big"));
      return;
    }
    setUploadProgress(0);
    const imagePath = await uploadFile(
      file,
      file.type,
      file.size,
      file.name,
      setUploadProgress,
    );
    form.getInputProps("defaults.imageFileBlob").onChange(file);
    form.getInputProps("defaults.imageFile").onChange(imagePath);
  }

  if (uploadProgress === 100) {
    return (
      <FileInput
        label="Cover"
        {...form.getInputProps("defaults.imageFileBlob")}
        accept="image/*"
        onChange={onFileChange}
        {...others}
      ></FileInput>
    );
  }

  return (
    <Progress
      animated
      value={uploadProgress}
      size="lg"
      transitionDuration={200}
    />
  );
}
