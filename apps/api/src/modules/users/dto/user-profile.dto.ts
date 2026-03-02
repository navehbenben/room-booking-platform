export class UserProfileDto {
  id!: string;
  email!: string;
  name!: string | null;
  createdAt!: Date;
  hasPassword!: boolean;
  hasGoogleAccount!: boolean;
}
