import { notifications } from "@mantine/notifications";
import { getAuth } from "firebase/auth"
import { getDownloadURL, getStorage, ref } from "firebase/storage";
import axios from "axios"; // TODO: remove axios dep
import config from "../config";

function displayError(err: any) {
    let message;
    if (axios.isAxiosError(err)) {
        message = `(${err.status}) ${err.response?.data || "Unknown"}`;
    } else {
        console.error(err);
        message = err.toString();
    }
    notifications.show({
        title: 'Error',
        message: message,
        color: 'red',
    });
}

async function getToken() {
    const user = getAuth().currentUser;
    if (user) {
        return await user.getIdToken();
    }
    return "";
}

function getAPIBase() {
    return config.api.LOCAL === "1" ? "http://localhost:8080/api" : "/api";
}

export async function apiPost(path: string, body: any) {
    try {
        const response = await axios.post(`${getAPIBase()}${path}`, body, {
            headers: {
                "x-requested-with": "XMLHttpRequest",
                Authorization: `Bearer ${await getToken()}`
            },
        });
        return response.data;
    } catch (err) {
        displayError(err);
        return undefined;
    }
}

export async function deleteAccount() {
    try {
        const user = getAuth().currentUser;
        if (!user) {
            throw new Error("User is not logged in");
        }
        const response = await apiPost("/delete", {});
        if (response !== undefined) {
            await user.delete();
        }
    } catch (err) {
        displayError(err);
        return null;
    }
}

export async function uploadFile(data: Blob | ArrayBuffer, type: string, size: number, name: string, onProg: (percent: number) => void) {
    try {
        const response = await apiPost("/presign-url", {
            size: size,
            name: name,
            contentType: type,
        });
        if (response === undefined) {
            return null;
        }
        const { url, path } = response;
        await axios.put(
            url,
            data,
            {
                headers: {
                    "Content-Type": type,
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const progress = progressEvent.loaded * 100 / progressEvent.total;
                        onProg(progress);
                    }
                }
            },
        );
        onProg(100);
        return path;
    } catch (err) {
        displayError(err);
        return null;
    }
}

export async function downloadFile(path: string, onProg: (percent: number) => void) {
    const storage = getStorage();
    const url = await getDownloadURL(ref(storage, path));
    const response = await axios.get(url, {
        responseType: "blob",
        onDownloadProgress: (event) => {
            if (event.total) {
                onProg(event.loaded / event.total);
            }
        },
    })
    onProg(100);
    return new File([response.data], path.split("/").at(-1)!, { type: response.headers["content-type"] });
}