import { sendSuccess } from "../utils/apiResponse.js";

export const getHealth = (req, res) =>
  sendSuccess(res, { message: "Server is healthy" });
