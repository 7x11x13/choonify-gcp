import { FileInput, Progress } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { useState } from "react";
import { UserSettings } from "../types/auth";
import { uploadFile } from "../util/api";
import config from "../config";
import { displayError } from "../util/log";

export function CoverArtInput({
  form,
  ...others
}: {
  form: UseFormReturnType<UserSettings, (values: UserSettings) => UserSettings>;
}) {
  const [uploadProgress, setUploadProgress] = useState(100);

  async function onFileChange(file: File | null) {
    if (!file) {
      return;
    }
    if (config.const.DISALLOWED_IMG_MIMETYPES.includes(file.type)) {
      displayError(`Image type ${file.type} is not supported`);
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
