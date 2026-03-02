import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rooms')
export class RoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Index()
  @Column({ type: 'int' })
  capacity!: number;

  @Column({ type: 'text', array: true, default: '{}' })
  features!: string[];

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  images!: string[];

  /**
   * IANA timezone identifier for the room's physical location.
   * Nullable so TypeORM can ADD COLUMN to existing tables without failing.
   * Application code treats NULL as 'UTC'.
   * Examples: "Europe/Rome", "America/New_York", "Asia/Tokyo"
   */
  @Column({ type: 'text', name: 'timezone', nullable: true, default: null })
  timezone!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
