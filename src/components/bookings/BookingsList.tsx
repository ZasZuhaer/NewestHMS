import React, { useState } from 'react';
import { Booking } from '../../types';
import BookingCard from './BookingCard';
import { useBookingStore } from '../../store/useBookingStore';
import { useRoomStore } from '../../store/useRoomStore';
import { useIsSmallScreen } from '../../hooks/useIsSmallScreen';
import { format, parseISO, addDays } from 'date-fns';
import { Search } from 'lucide-react';

const BookingsList: React.FC = () => {
  const { getAllBookings } = useBookingStore();
  const { getRoomById } = useRoomStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [searchRoomNumber, setSearchRoomNumber] = useState('');


  
  const bookings = getAllBookings();
  const today = new Date();
  const isSmallScreen = useIsSmallScreen();

  
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
    // Text search
    const searchMatch = !searchTerm || (
      booking.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.nationalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRoomById(booking.roomId)?.roomNumber.includes(searchRoomNumber)
    );
  
    let dateMatch = true;
  
    // Parse dates once
    const bookingDate = parseISO(booking.bookingDate);
    const checkOutDate = booking.checkOutDateTime ? parseISO(booking.checkOutDateTime) : null;
  
    if (appliedStartDate && !appliedEndDate) {
      // Only start date provided → bookingDate must equal startDate
      dateMatch = format(bookingDate, 'yyyy-MM-dd') === appliedStartDate;
    } else if (!appliedStartDate && appliedEndDate) {
      // Only end date provided → checkOutDate must equal endDate
      if (checkOutDate) {
        dateMatch = format(checkOutDate, 'yyyy-MM-dd') === appliedEndDate;
      } else {
        dateMatch = false; // No checkout date means it won't match
      }
    } else if (appliedStartDate && appliedEndDate) {
      // Both provided → bookingDate must be within the range
      const start = parseISO(appliedStartDate);
      const end = parseISO(appliedEndDate);
      dateMatch = bookingDate >= start && bookingDate <= end;
    }
  
    return searchMatch && dateMatch;
  });


  
  const handleBookingUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center bg-white rounded-lg shadow-lg p-2 gap-2">
  

  <div className="flex items-center flex-1 bg-white rounded-lg">
    <Search className="h-5 w-5 text-gray-400 ml-2 mr-1" />
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search by guest name, ID, phone or room number..."
      className="flex-1 px-2 py-2 border-0 focus:ring-0 focus:outline-none"
    />
  </div>

  <div className="flex items-center">
    <label className="text-sm font-medium mr-2">Room:</label>
    <input
      type="number"
      value={searchRoomNumber}
      onChange={(e) => setSearchRoomNumber(e.target.value)}
      className="w-24 px-2 py-2 border rounded-md text-sm"
    />
  </div>
        
  <div className="flex items-center">
    <label className="text-sm font-medium mr-2">Booking Date:</label>
    <input
      type="date"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
      className="px-2 py-2 border rounded-md text-sm"
    />
  </div>

  <div className="flex items-center">
  <label className="text-sm font-medium mr-2">
    {startDate ? "To Date:" : "Checkout Date:"}
  </label>
  <input
    type="date"
    value={endDate}
    onChange={(e) => setEndDate(e.target.value)}
    className="px-2 py-2 border rounded-md text-sm"
  />
</div>


  {/* Search button */}
  <button
    onClick={() => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate); }}
    className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700"
  >
    Search
  </button>

  {/* Clear button */}
  <button
    onClick={() => {
      setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    }}
    className="px-4 py-2 bg-gray-300 text-gray-800 text-sm rounded-md hover:bg-gray-400"
  >
    Clear
  </button>
</div>

      
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-lg">
          <p className="text-gray-500">No bookings found</p>
        </div>
      ) : ( 
<div className="grid grid-cols-2 gap-1"
>
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
  variant={isSmallScreen ? "default" : "list"}  // ✅ here
/>


            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookingsList;