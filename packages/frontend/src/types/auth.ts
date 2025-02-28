import { UploadItem } from "./upload";

export type UserSettings = {
  defaults: UploadItem;
  defaultChannelId: string;
};

export type YTChannel = {
  channelId: string;
  picture: string;
  name: string;
};

export type ChoonifyUserInfo = {
  subscription: number;
  customerId: string;
  uploadedToday: number;
  uploadedBytesToday: number;
  lastUploaded: number;
  uploadedAllTime: number;
  uploadedBytesAllTime: number;
  channels: YTChannel[];
  settings: UserSettings;
};

export function realUploadedToday(userInfo: ChoonifyUserInfo) {
  const now = new Date();
  const todayStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  if (userInfo.lastUploaded < todayStart) {
    return { uploaded: 0, uploadedBytes: 0 };
  } else {
    return {
      uploaded: userInfo.uploadedToday,
      uploadedBytes: userInfo.uploadedBytesToday,
    };
  }
}
