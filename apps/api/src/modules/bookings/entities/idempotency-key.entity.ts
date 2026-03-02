import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Stores the outcome of every request that carries an Idempotency-Key header.
 *
 * Lifecycle:
 *   1. A row is inserted with responseCode = NULL when processing begins.
 *   2. On success the row is updated (in the same transaction as the booking)
 *      with responseCode = 201 and the serialised response body.
 *   3. On a booking conflict the row is upserted (outside the rolled-back
 *      transaction) with responseCode = 409 and the conflict error body.
 *
 * A row with responseCode = NULL indicates an in-flight request.  Any retry
 * that arrives while the original is still in-flight receives a 409
 * IDEMPOTENT_REQUEST_IN_PROGRESS and should back off for ~1 s.
 *
 * Rows are authoritative for 24 hours (expiresAt).  A background cleanup job
 * (or a CRON) should periodically delete expired rows.
 */
@Entity('idempotency_keys')
@Index(['idempotencyKey', 'userId'], { unique: true })
export class IdempotencyKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'idempotency_key' })
  idempotencyKey!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  /**
   * HTTP status of the original response.
   * NULL while the request is still being processed (in-flight).
   */
  @Column({ type: 'int', name: 'response_code', nullable: true, default: null })
  responseCode!: number | null;

  /**
   * Serialised JSON response body of the original request.
   * NULL while the request is still being processed (in-flight).
   */
  @Column({ type: 'jsonb', name: 'response_body', nullable: true, default: null })
  responseBody!: object | null;

  /**
   * Absolute expiry after which this record can be ignored and purged.
   * Clients may not replay keys beyond this timestamp.
   *
   * Nullable so TypeORM can ADD this column to an existing table that already
   * has rows (ALTER TABLE … ADD COLUMN … NOT NULL fails when rows exist).
   * Application code always supplies the value on insert; NULL only occurs in
   * rows that pre-date this column — those are treated as expired.
   */
  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true, default: null })
  expiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}