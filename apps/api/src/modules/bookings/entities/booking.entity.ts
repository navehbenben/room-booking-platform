import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RoomEntity } from '../../rooms/entities/room.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

@Entity('bookings')
@Index(['roomId', 'startTime', 'endTime']) // fast overlap candidate queries
@Index(['userId', 'createdAt']) // fast "my bookings" queries
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'room_id' })
  roomId!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'timestamptz', name: 'start_time' })
  startTime!: Date;

  @Column({ type: 'timestamptz', name: 'end_time' })
  endTime!: Date;

  @Column({ type: 'text', default: 'CONFIRMED' })
  status!: BookingStatus;

  /**
   * Optional free-text note from the booker (e.g. "AV setup needed").
   * Not used in conflict-detection logic; stored for display only.
   */
  @Column({ type: 'text', nullable: true, default: null })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => RoomEntity)
  @JoinColumn({ name: 'room_id' })
  room?: RoomEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}
