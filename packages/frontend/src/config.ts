const config = {
    settings: {
        DEFAULT_COVER_IMAGE: "public/default-image",
    },
    google: {
        CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    },
    api: {
        LOCAL: import.meta.env.VITE_LOCAL_BACKEND
    }
};

export default config;
