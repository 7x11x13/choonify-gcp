export type WSBaseMessage = {
    type: "error" | "progress" | "success";
    itemId: string;
}

export type WSErrorMessage = WSBaseMessage & {
    type: "error";
    message: string;
    reloadUsers: boolean;
}

export type WSRenderProgressMessage = WSBaseMessage & {
    type: "progress";
    percent: number;
}

export type WSRenderSuccessMessage = WSBaseMessage & {
    type: "success";
    videoUrl: string;
    elapsed: number;
}