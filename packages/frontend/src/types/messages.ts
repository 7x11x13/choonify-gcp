import { ErrorBody } from "./api";

export type BaseMessage = {
  type: "error" | "progress" | "success";
  itemId: string;
  timestamp: number;
};

export type ErrorMessage = BaseMessage & {
  type: "error";
  message: ErrorBody;
  reloadUsers: boolean;
};

export type RenderProgressMessage = BaseMessage & {
  type: "progress";
  percent: number;
};

export type RenderSuccessMessage = BaseMessage & {
  type: "success";
  videoUrl: string;
  elapsed: number;
};
