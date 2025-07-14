import { create } from 'zustand';
import { Booking, RoomFilter, CancellationRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { isWithinInterval, parseISO, addDays, isBefore, isAfter, startOfDay } from 'date-fns';

interface BookingState {
  bookings: Booking[];
  cancellationRequests: CancellationRequest[];
  addBooking: (booking: Omit<Booking, 'id'>) => string;
  updateBooking: (id: string, bookingData: Partial<Booking>) => boolean;
  deleteBooking: (id: string) => boolean;
  getBookingById: (id: string) => Booking | undefined;
  getBookingsForRoom: (roomId: string) => Booking[];
  getBookingsForGuest: (guestId: string) => Booking[];
  getAllBookings: () => Booking[];
  checkIn: (bookingId: string) => boolean;
  checkOut: (bookingId: string) => boolean;
  cancelBooking: (bookingId: string) => boolean;
  requestCancellation: (bookingId: string, userId: string) => string;
  approveCancellation: (requestId: string, userId: string) => boolean;
  rejectCancellation: (requestId: string, userId: string) => boolean;
  getCancellationRequests: () => CancellationRequest[];
  getPendingCancellationRequests: () => CancellationRequest[];
  getCancellationRequestForBooking: (bookingId: string) => CancellationRequest | undefined;
  isRoomAvailable: (roomId: string, startDate: string, endDate: string, excludeBookingId?: string) => boolean;
  getCurrentBookingsForRoom: (roomId: string) => Booking[];
  getFutureBookingsForRoom: (roomId: string) => Booking[];
  getPastBookingsForRoom: (roomId: string) => Booking[];
  getAvailableRoomIds: (startDate: string, endDate: string) => string[];
  getOccupiedRoomIds: () => string[];
  getBookedRoomIds: (date: string) => string[];
}

const initialBookings: Booking[] = [
  {
    id: '1',
    roomId: '1',
    guestId: '1',
    guestName: 'Ahmed Khan',
    nationalId: 'BX782435',
    phone: '01712345678',
    numberOfPeople: 2,
    totalAmount: 5000,
    paidAmount: 2500,
    bookingDate: new Date().toISOString().split('T')[0],
    durationDays: 3,
    checkInDateTime: new Date().toISOString(),
  },
  {
    id: '2',
    roomId: '2',
    guestId: '2',
    guestName: 'Fatima Rahman',
    nationalId: 'AZ567890',
    phone: '01898765432',
    numberOfPeople: 2,
    totalAmount: 6000,
    paidAmount: 6000,
    bookingDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    durationDays: 2,
  },
  {
    id: '3',
    roomId: '3',
    guestId: '3',
    guestName: 'Kamal Hossain',
    nationalId: 'CY123456',
    phone: '01612345678',
    numberOfPeople: 4,
    totalAmount: 8000,
    paidAmount: 4000,
    bookingDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    durationDays: 5,
    checkInDateTime: new Date(Date.now() - 86400000 * 2).toISOString(),
    checkOutDateTime: new Date().toISOString(),
  },
];

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: initialBookings,
  cancellationRequests: [],

  addBooking: (bookingData) => {
    const id = uuidv4();
    const newBooking = { ...bookingData, id };
    set((state) => {
      const updatedBookings = [...state.bookings, newBooking];
      return { bookings: updatedBookings };
    });
    return id;
  },

  updateBooking: (id, bookingData) => {
    let updated = false;
    set((state) => {
      const updatedBookings = state.bookings.map((booking) => {
        if (booking.id === id) {
          updated = true;
          return { ...booking, ...bookingData };
        }
        return booking;
      });
      return { bookings: updatedBookings };
    });
    return updated;
  },

  deleteBooking: (id) => {
    let deleted = false;
    set((state) => {
      const filteredBookings = state.bookings.filter((booking) => {
        if (booking.id === id) {
          deleted = true;
          return false;
        }
        return true;
      });
      return { bookings: filteredBookings };
    });
    return deleted;
  },

  getBookingById: (id) => {
    return get().bookings.find((booking) => booking.id === id);
  },

  getBookingsForRoom: (roomId) => {
    return get().bookings.filter((booking) => booking.roomId === roomId);
  },

  getBookingsForGuest: (guestId) => {
    return get().bookings.filter((booking) => booking.guestId === guestId);
  },

  getAllBookings: () => {
    return get().bookings;
  },

  checkIn: (bookingId) => {
    const booking = get().getBookingById(bookingId);
    if (!booking || booking.checkInDateTime) return false;
    
    const checkInDateTime = new Date().toISOString();
    const updated = get().updateBooking(bookingId, { checkInDateTime });
  
    if (updated) {
      // Remove any cancellation request for this booking
      set(state => ({
        cancellationRequests: state.cancellationRequests.filter(
          (request) => request.bookingId !== bookingId
        )
      }));
    }
  
    return updated;
  },


  checkOut: (bookingId) => {
    const booking = get().getBookingById(bookingId);
    if (!booking || !booking.checkInDateTime || booking.checkOutDateTime) return false;
    
    const checkOutDateTime = new Date().toISOString();
    return get().updateBooking(bookingId, { checkOutDateTime });
  },

  cancelBooking: (bookingId) => {
    const booking = get().getBookingById(bookingId);
    if (!booking || booking.checkInDateTime || booking.cancelledAt) return false;
    
    const updated = get().updateBooking(bookingId, {
      cancelledAt: new Date().toISOString()
    });
  
    if (updated) {
      // Remove any existing cancellation requests for this booking
      set(state => ({
        cancellationRequests: state.cancellationRequests.filter(
          (request) => request.bookingId !== bookingId
        )
      }));
    }
  
    return updated;
  },

  requestCancellation: (bookingId, userId) => {
    const booking = get().getBookingById(bookingId);
    if (!booking || booking.checkInDateTime || booking.cancelledAt) {
      throw new Error('Cannot request cancellation for this booking');
    }

    const existingRequest = get().getCancellationRequestForBooking(bookingId);
    if (existingRequest) {
      throw new Error('Cancellation request already exists or has been reviewed');
    }


    const id = uuidv4();
    const request: CancellationRequest = {
      id,
      bookingId,
      requestedBy: userId,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    };

    set(state => ({
      cancellationRequests: [...state.cancellationRequests, request]
    }));

    return id;
  },

  approveCancellation: (requestId, userId) => {
    let success = false;
    
    set(state => {
      const updatedRequests = state.cancellationRequests.map(request => {
        if (request.id === requestId && request.status === 'pending') {
          success = true;
          return {
            ...request,
            status: 'approved',
            resolvedAt: new Date().toISOString(),
            resolvedBy: userId
          };
        }
        return request;
      });

      if (success) {
        const request = state.cancellationRequests.find(r => r.id === requestId);
        if (request) {
          get().cancelBooking(request.bookingId);
        }
      }

      return { cancellationRequests: updatedRequests };
    });

    return success;
  },

  rejectCancellation: (requestId, userId) => {
    let success = false;
    
    set(state => {
      const updatedRequests = state.cancellationRequests.map(request => {
        if (request.id === requestId && request.status === 'pending') {
          success = true;
          return {
            ...request,
            status: 'rejected',
            resolvedAt: new Date().toISOString(),
            resolvedBy: userId
          };
        }
        return request;
      });

      return { cancellationRequests: updatedRequests };
    });

    return success;
  },

  getCancellationRequests: () => {
    return get().cancellationRequests;
  },

  getPendingCancellationRequests: () => {
    return get().cancellationRequests.filter(request => request.status === 'pending');
  },

  getCancellationRequestForBooking: (bookingId) => {
    return get().cancellationRequests.find(request => request.bookingId === bookingId);
  },

  isRoomAvailable: (roomId, startDate, endDate, excludeBookingId) => {
    const bookings = get().getBookingsForRoom(roomId);
    const requestStart = startOfDay(parseISO(startDate));
    const requestEnd = startOfDay(addDays(parseISO(endDate), -1));
    
    return !bookings.some((booking) => {
      if (excludeBookingId && booking.id === excludeBookingId) return false;
      if (booking.checkOutDateTime) return false; // Room is available if booking is checked out
      if (booking.cancelledAt) return false;
      
      const bookingStart = startOfDay(parseISO(booking.bookingDate));
      const bookingEnd = startOfDay(addDays(parseISO(booking.bookingDate), booking.durationDays - 1));
      
      return (
        (isWithinInterval(requestStart, { start: bookingStart, end: bookingEnd }) ||
         isWithinInterval(requestEnd, { start: bookingStart, end: bookingEnd }) ||
         (isBefore(requestStart, bookingStart) && isAfter(requestEnd, bookingEnd)))
      );
    });
  },

  getCurrentBookingsForRoom: (roomId) => {
    const now = startOfDay(new Date());
    return get().getBookingsForRoom(roomId).filter((booking) => {
      if (!booking.checkInDateTime || booking.checkOutDateTime) return false;
      
      const bookingStart = startOfDay(parseISO(booking.bookingDate));
      const bookingEnd = startOfDay(addDays(parseISO(booking.bookingDate), booking.durationDays - 1));
      
      return isWithinInterval(now, { start: bookingStart, end: bookingEnd });
    });
  },

  getFutureBookingsForRoom: (roomId) => {
    const now = startOfDay(new Date());
    return get().getBookingsForRoom(roomId).filter((booking) => {
      if (booking.checkOutDateTime) return false;
      
      const bookingStart = startOfDay(parseISO(booking.bookingDate));
      return (isAfter(bookingStart, now) || bookingStart.getTime() === now.getTime()) && !booking.checkInDateTime;
    });
  },

  getPastBookingsForRoom: (roomId) => {
    return get().getBookingsForRoom(roomId).filter((booking) => {
      return !!booking.checkOutDateTime;
    });
  },

  getAvailableRoomIds: (startDate: string, endDate: string) => {
    const allRooms = get().rooms || []; // We need to get all rooms from somewhere
    const allBookings = get().getAllBookings();
    const unavailableRoomIds = new Set<string>();
    
    const requestStart = startOfDay(parseISO(startDate));
    const requestEnd = startOfDay(addDays(parseISO(endDate), -1));
    
    allBookings.forEach((booking) => {
      // Skip if booking is checked out or cancelled
      if (booking.checkOutDateTime || booking.cancelledAt) return;
      
      const bookingStart = startOfDay(parseISO(booking.bookingDate));
      const bookingEnd = startOfDay(addDays(parseISO(booking.bookingDate), booking.durationDays - 1));
      
      // Check if there's any overlap between request period and booking period
      if (
        (isWithinInterval(requestStart, { start: bookingStart, end: bookingEnd }) ||
         isWithinInterval(requestEnd, { start: bookingStart, end: bookingEnd }) ||
         (isBefore(requestStart, bookingStart) && isAfter(requestEnd, bookingEnd)))
      ) {
        unavailableRoomIds.add(booking.roomId);
      }
    });
    
    // We need access to all rooms, not just booked rooms
    // This is a temporary fix - we should get all room IDs from room store
    const allRoomIds = Array.from(new Set(allBookings.map(b => b.roomId)));
    return allRoomIds.filter((roomId) => !unavailableRoomIds.has(roomId));
  },

  getOccupiedRoomIds: () => {
    const now = startOfDay(new Date());
    const occupiedRoomIds = new Set<string>();
    
    get().bookings.forEach((booking) => {
      if (!booking.checkInDateTime || booking.checkOutDateTime) return;
      
      const bookingStart = startOfDay(parseISO(booking.bookingDate));
      const bookingEnd = startOfDay(addDays(parseISO(booking.bookingDate), booking.durationDays - 1));
      
      if (isWithinInterval(now, { start: bookingStart, end: bookingEnd })) {
        occupiedRoomIds.add(booking.roomId);
      }
    });
    
    return Array.from(occupiedRoomIds);
  },

  getBookedRoomIds: (date) => {
    const targetDate = startOfDay(parseISO(date));
    const bookedRoomIds = new Set<string>();
    
    get().bookings.forEach((booking) => {
      if (booking.checkOutDateTime) return; // Room is available if booking is checked out
      
      const bookingStart = startOfDay(parseISO(booking.bookingDate));
      const bookingEnd = startOfDay(addDays(parseISO(booking.bookingDate), booking.durationDays - 1));
      
      if (isWithinInterval(targetDate, { start: bookingStart, end: bookingEnd })) {
        bookedRoomIds.add(booking.roomId);
      }
    });
    
    return Array.from(bookedRoomIds);
  },
}));