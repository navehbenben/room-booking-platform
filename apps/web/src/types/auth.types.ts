export interface AuthTokens {
  accessToken: string;
  userId: string;
  // refreshToken lives in HttpOnly cookie — not returned in response body
}
