export const validateToken = (request: Request, env: { INTERNAL_API_TOKEN: string }) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${env.INTERNAL_API_TOKEN}`) {
    return false;
  }
  return true;
};
