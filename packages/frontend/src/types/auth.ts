import { UploadItem } from "./upload";

export type YouTubeChannel = {
    id: string;
    imageUrl: string;
    name: string;
};

export type ChoonifyUserInfo = {
    cognitoId: string,
    subscription: number,
    defaults: UploadItem,
    uploadedToday: number,
    uploadedBytesToday: number,
    lastUploaded: number,
    uploadedAllTime: number,
    uploadedBytesAllTime: number
}