export type UserRole = 'admin' | 'manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type RoomCategory = 'Double' | 'Couple' | 'Connecting';

export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  category: RoomCategory;
  beds: number;
  bathrooms: number;
  hasAC: boolean;
  description: string;
  problems: string[];
}

export interface Guest {
  id: string;
  name: string;
  nationalId: string;
  phone: string;
}

export interface Booking {
  id: string;
  roomId: string;
  guestId: string;
  guestName: string;
  nationalId: string;
  phone: string;
  numberOfPeople: number;
  totalAmount: number;
  paidAmount: number;
  bookingDate: string; // ISO date string
  durationDays: number;
  checkInDateTime?: string; // ISO date-time string
  checkOutDateTime?: string; // ISO date-time string
  cancelledAt?: string; // ISO date-time string
}

export interface CancellationRequest {
  id: string;
  bookingId: string;
  requestedBy: string; // User ID
  requestedAt: string; // ISO date-time string
  status: 'pending' | 'approved' | 'rejected';
  resolvedAt?: string; // ISO date-time string
  resolvedBy?: string; // User ID
}

export type TabType = 'rooms' | 'guests' | 'bookings' | 'overview' | 'requests';

export type RoomFilter = {
  category?: RoomCategory;
  startDate?: string;
  endDate?: string;
  hasAC?: boolean;
};