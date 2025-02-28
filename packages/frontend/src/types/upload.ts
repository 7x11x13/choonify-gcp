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

export type UploadItemWithoutBlob = {
    id: string,
    createdAt: number,
    originalAudioFileName: string,
    audioFile: string,
    audioFileLength: number,
    audioFileSize: number,
    imageFile: string,
    imageFileSize: number,
    metadata: YTMetadata,
    settings: RenderSettings
}

export type UploadItem = UploadItemWithoutBlob & {
    imageFileBlob: File | null,
}

export type UploadSession = {
    items: UploadItemWithoutBlob[]
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