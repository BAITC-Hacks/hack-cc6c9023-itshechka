import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const WORKER_ACCESS_KEY = "workerAccess";
export const WorkerAccess = () => SetMetadata(WORKER_ACCESS_KEY, true);
