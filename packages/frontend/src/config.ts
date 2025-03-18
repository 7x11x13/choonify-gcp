const config = {
  settings: {
    DEFAULT_COVER_IMAGE: "public/default-image",
  },
  google: {
    CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  },
  api: {
    LOCAL: import.meta.env.VITE_LOCAL_BACKEND === "1",
  },
  ads: {
    ENABLED: import.meta.env.VITE_ENABLE_ADS === "1",
  },
  const: {
    UPLOAD_QUOTA_BYTES: [
      100 * 1000 * 1000, // tier 0: 100 MB
      500 * 1000 * 1000, // tier 1: 500 MB
      5 * 1000 * 1000 * 1000, // tier 2: 5 GB
      50 * 1000 * 1000 * 1000, // tier 3: 50 GB
    ],
    DISALLOWED_IMG_MIMETYPES: ["image/heif", "image/heic", "image/avif"],
    MAX_IMAGE_SIZE_BYTES: 20 * 1000 * 1000, // 20 MB,
  },
};

export default config;
