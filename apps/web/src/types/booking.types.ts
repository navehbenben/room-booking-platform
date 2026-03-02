export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'PENDING';

export interface Booking {
  bookingId: string;
  roomId: string;
  roomName?: string;
  start: string;
  end: string;
  status: BookingStatus | string;
  createdAt: string;
}

export interface Hold {
  holdId: string;
  roomId: string;
  start: string;
  end: string;
  expiresAt: string;
}
