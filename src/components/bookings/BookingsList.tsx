import React, { useState } from 'react';
import { Booking } from '../../types';
import BookingCard from './BookingCard';
import { useBookingStore } from '../../store/useBookingStore';
import { useRoomStore } from '../../store/useRoomStore';
import { format, parseISO, addDays } from 'date-fns';
import { Search } from 'lucide-react';

const BookingsList: React.FC = () => {
  const { getAllBookings } = useBookingStore();
  const { getRoomById } = useRoomStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  const bookings = getAllBookings();
  const today = new Date();
  
  // Sort bookings by date (most recent first)
const sortedBookings = [...bookings].sort((a, b) => {
  const aIsCancelled = !!a.cancelledAt;
  const bIsCancelled = !!b.cancelledAt;

  const aIsActive = a.checkInDateTime && !a.checkOutDateTime;
  const bIsActive = b.checkInDateTime && !b.checkOutDateTime;

  const aIsFuture = !a.checkInDateTime && !a.cancelledAt;
  const bIsFuture = !b.checkInDateTime && !b.cancelledAt;

  const aIsPast = a.checkInDateTime && a.checkOutDateTime;
  const bIsPast = b.checkInDateTime && b.checkOutDateTime;

  const getPriority = (booking: Booking) => {
    if (booking.checkInDateTime && !booking.checkOutDateTime) return 1;  // Active
    if (!booking.checkInDateTime && !booking.cancelledAt) return 2;      // Not checked in yet
    if (booking.checkInDateTime && booking.checkOutDateTime) return 3;   // Past
    if (booking.cancelledAt) return 4;                                    // Cancelled
    return 5;
  };

  const priorityA = getPriority(a);
  const priorityB = getPriority(b);

  if (priorityA !== priorityB) return priorityA - priorityB;

  // Sub-sorting inside categories
  if (priorityA === 1) {
    return new Date(b.checkInDateTime!).getTime() - new Date(a.checkInDateTime!).getTime();
  }
  if (priorityA === 2) {
    return new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
  }
  if (priorityA === 3) {
    return new Date(b.checkOutDateTime!).getTime() - new Date(a.checkOutDateTime!).getTime();
  }
  if (priorityA === 4) {
    return new Date(b.cancelledAt!).getTime() - new Date(a.cancelledAt!).getTime();
  }

  return 0;
});



  
  const filteredBookings = sortedBookings.filter(booking => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      booking.guestName.toLowerCase().includes(searchLower) ||
      booking.nationalId.toLowerCase().includes(searchLower) ||
      booking.phone.toLowerCase().includes(searchLower) ||
      getRoomById(booking.roomId)?.roomNumber.includes(searchTerm)
    );
  });
  
  const handleBookingUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center bg-white rounded-lg shadow-lg p-2">
        <Search className="h-5 w-5 text-gray-400 ml-2 mr-1" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by guest name, ID, phone or room number..."
          className="flex-1 px-2 py-2 border-0 focus:ring-0 focus:outline-none"
        />
      </div>
      
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-lg">
          <p className="text-gray-500">No bookings found</p>
        </div>
      ) : (
<div className="flex flex-col gap-2">
          {filteredBookings.map(booking => {
            const room = getRoomById(booking.roomId);
            const isActive = booking.checkInDateTime && !booking.checkOutDateTime;
            
            return (
              <BookingCard 
  key={`${booking.id}-${refreshKey}`} 
  booking={booking}
  isActive={isActive}
  showRoom={true}
  onUpdate={handleBookingUpdated}
  roomNumber={room?.roomNumber}   // ✅ this is new prop
  variant="list"  // ✅ here
/>


            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookingsList;