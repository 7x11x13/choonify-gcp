import { UploadItem } from "./upload";

export type UserSettings = {
    defaults: UploadItem,
    defaultChannelId: string,
}

export type YTChannel = {
    channelId: string;
    picture: string;
    name: string;
};

export type ChoonifyUserInfo = {
    subscription: number,
    uploadedToday: number,
    uploadedBytesToday: number,
    lastUploaded: number,
    uploadedAllTime: number,
    uploadedBytesAllTime: number,
    channels: YTChannel[],
    settings: UserSettings,
}