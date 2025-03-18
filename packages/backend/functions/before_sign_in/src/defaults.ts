import config from "./config";

function getDefaultTitleTemplateString(): string {
  return "<% if(it.metadata.title && it.metadata.artist) { %>\n    <%_ = it.metadata.artist %> - <% = it.metadata.title %>\n<% } else { %>\n    <%_ = it.file.name %>\n<% } %>";
}

function getDefaultUploadItem() {
  return {
    id: "",
    createdAt: 0,
    originalAudioFileName: "",
    audioFile: "",
    audioFileLength: 0,
    audioFileSize: 0,
    imageFile: config.settings.DEFAULT_COVER_IMAGE,
    imageFileSize: 0,
    metadata: {
      title: getDefaultTitleTemplateString(),
      description: "Uploaded with https://choonify.com",
      tags: ["choonify"],
      categoryId: "10",
      madeForKids: false,
      visibility: "public",
      notifySubscribers: true,
    },
    settings: {
      filterType: "solidblack",
      watermark: true,
      backgroundColor: "#000000",
    },
  };
}

function getDefaultUserSettings() {
  return {
    defaults: getDefaultUploadItem(),
    defaultChannelId: "",
  };
}

export function getDefaultUserInfo() {
  return {
    subscription: 0,
    customerId: "",
    uploadedToday: 0,
    uploadedBytesToday: 0,
    uploadedAllTime: 0,
    uploadedBytesAllTime: 0,
    lastUploaded: 0,
    channels: [],
    settings: getDefaultUserSettings(),
  };
}
