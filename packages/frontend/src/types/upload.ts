export type YTMetadata = {
    title: string,
    description: string,
    tags: Array<string>,
    categoryId: string,
    madeForKids: boolean,
    visibility: string,
    notifySubscribers: boolean,
}

export type RenderSettings = {
    filterType: FilterType,
    watermark: boolean,
    backgroundColor: string
}

export type UploadItem = {
    id: string,
    originalAudioFileName: string,
    audioFile: string,
    audioFileLength: number,
    audioFileSize: number,
    imageFile: string,
    imageFileBlob: File | null,
    metadata: YTMetadata,
    settings: RenderSettings
}

export type UploadItemWithoutBlob = {
    id: string,
    originalAudioFileName: string,
    audioFile: string,
    audioFileLength: number,
    audioFileSize: number,
    imageFile: string,
    metadata: YTMetadata,
    settings: RenderSettings
}

export type UploadRequest = {
    channelId: string,
    videos: UploadItemWithoutBlob[]
}

export enum FilterType {
    BLACK_BACKGROUND = "solidblack",
    COLOR_BACKGROUND = "solidcolor",
    BLURRED_BACKGROUND = "blurred",
}