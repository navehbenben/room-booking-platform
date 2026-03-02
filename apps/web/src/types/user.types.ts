export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  hasPassword: boolean;
  hasGoogleAccount: boolean;
}