export const sendSuccess = (
  res,
  { statusCode = 200, message = "Success", data } = {},
) => {
  const body = { success: true, message };

  if (data !== undefined) {
    body.data = data;
  }

  return res.status(statusCode).json(body);
};
