import { useState } from 'react';
import { FileInput, Progress } from '@mantine/core';
import { uploadFile } from '../util/aws';
import { UseFormReturnType } from '@mantine/form';
import { UploadItem } from '../types/upload';

export function CoverArtInput({ form, isDefault, ...others }: {
    form: UseFormReturnType<UploadItem, (values: UploadItem) => UploadItem>, isDefault: boolean
}) {
    const [uploadProgress, setUploadProgress] = useState(100);

    async function onFileChange(file: File | File[] | null) {
        setUploadProgress(0);
        const image = file as File;
        const imagePath = await uploadFile(image, image.type, image.size, image.name, setUploadProgress, isDefault);
        form.getInputProps("imageFileBlob").onChange(image);
        form.getInputProps("imageFile").onChange(imagePath);
    }

    if (uploadProgress === 100) {
        return <FileInput label="Cover" {...form.getInputProps("imageFileBlob")} accept="image/*" onChange={onFileChange} {...others}></FileInput>
    }

    return <Progress value={uploadProgress} size="lg" transitionDuration={200} />
}