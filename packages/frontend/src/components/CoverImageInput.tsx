import { FileInput, Progress } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { useState } from 'react';
import { UserSettings } from '../types/auth';
import { uploadFile } from '../util/aws';

export function CoverArtInput({ form, ...others }: {
    form: UseFormReturnType<UserSettings, (values: UserSettings) => UserSettings>
}) {
    const [uploadProgress, setUploadProgress] = useState(100);

    async function onFileChange(file: File | File[] | null) {
        setUploadProgress(0);
        const image = file as File;
        const imagePath = await uploadFile(image, image.type, image.size, image.name, setUploadProgress);
        form.getInputProps("defaults.imageFileBlob").onChange(image);
        form.getInputProps("defaults.imageFile").onChange(imagePath);
    }

    if (uploadProgress === 100) {
        return <FileInput label="Cover" {...form.getInputProps("defaults.imageFileBlob")} accept="image/*" onChange={onFileChange} {...others}></FileInput>
    }

    return <Progress value={uploadProgress} size="lg" transitionDuration={200} />
}