import { Request } from "express";

export const getClientIP = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? typeof forwarded === "string"
      ? forwarded.split(",")[0]
      : forwarded[0]
    : req.socket.remoteAddress || "unknown";
  return ip.replace("::ffff:", "");
};

export default getClientIP;
