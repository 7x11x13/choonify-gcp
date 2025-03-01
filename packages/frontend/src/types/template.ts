import { FileWithPath } from "@mantine/dropzone";
import { ICommonTagsResult, IFormat } from "music-metadata";

export type TemplateStringInput = {
    metadata: ICommonTagsResult,
    format: IFormat,
    file: FileWithPath,
};