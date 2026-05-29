export const successResponse = (data: object, status = 200) =>
  Response.json(data, { status });

export const errorResponse = (message: string, status = 500) => {
  console.error(`APIエラー[${status}]:`, message);
  return Response.json({ error: message, products: [] }, { status });
};
