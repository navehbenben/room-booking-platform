import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  email!: string;

  // Nullable: Google OAuth users have no password
  @Column({ type: 'text', name: 'password_hash', nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'text', nullable: true })
  name!: string | null;

  // Google OAuth provider ID — null for email/password users.
  // Partial unique index (WHERE google_id IS NOT NULL) allows many NULL values
  // while still enforcing uniqueness among accounts that DO have a Google ID.
  @Index('idx_users_google_id_unique', { unique: true, where: '"google_id" IS NOT NULL' })
  @Column({ type: 'text', name: 'google_id', nullable: true })
  googleId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
