import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import * as authService from "../services/auth.service.js";

export const signupAs = (role) =>
  asyncHandler(async (req, res) => {
    const result = await authService.signup({
      role,
      name: req.body?.name,
      email: req.body?.email,
      password: req.body?.password,
      accessCode: req.body?.accessCode,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Account created successfully",
      data: result,
    });
  });

export const loginAs = (role) =>
  asyncHandler(async (req, res) => {
    const result = await authService.login({
      role,
      email: req.body?.email,
      password: req.body?.password,
    });

    return sendSuccess(res, { message: "Logged in successfully", data: result });
  });

export const getMe = asyncHandler(async (req, res) =>
  sendSuccess(res, { message: "Current user", data: { user: req.user } }),
);
