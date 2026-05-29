export const withErrorHandling = async (
  handler: () => Promise<Response>
): Promise<Response> => {
  try {
    return await handler();
  } catch (error) {
    console.error("APIエラー:", error);
    const message = error instanceof Error ? error.message : "予期せぬエラーが発生しました";
    return Response.json({ error: message, products: [] }, { status: 500 });
  }
};
