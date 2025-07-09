import React, { useState } from 'react';
import { Booking } from '../../types';
import BookingCard from './BookingCard';
import { useBookingStore } from '../../store/useBookingStore';
import { useRoomStore } from '../../store/useRoomStore';
import { useIsSmallScreen } from '../../hooks/useIsSmallScreen';
import { format, parseISO } from 'date-fns';
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
  const isSmallScreen = useIsSmallScreen();

  const sortedBookings = [...bookings].sort((a, b) => {
    const getPriority = (booking: Booking) => {
      if (booking.checkInDateTime && !booking.checkOutDateTime) return 1;
      if (!booking.checkInDateTime && !booking.cancelledAt) return 2;
      if (booking.checkInDateTime && booking.checkOutDateTime) return 3;
      if (booking.cancelledAt) return 4;
      return 5;
    };

    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    if (priorityA !== priorityB) return priorityA - priorityB;

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
    const searchMatch = !searchTerm || (
      booking.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.nationalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const room = getRoomById(booking.roomId);
    const roomMatch = !searchRoomNumber || (room && room.roomNumber === searchRoomNumber);

    let dateMatch = true;
    const bookingDate = parseISO(booking.bookingDate);
    const checkOutDate = booking.checkOutDateTime ? parseISO(booking.checkOutDateTime) : null;

    if (appliedStartDate && !appliedEndDate) {
      dateMatch = format(bookingDate, 'yyyy-MM-dd') === appliedStartDate;
    } else if (!appliedStartDate && appliedEndDate) {
      if (checkOutDate) {
        dateMatch = format(checkOutDate, 'yyyy-MM-dd') === appliedEndDate;
      } else {
        dateMatch = false;
      }
    } else if (appliedStartDate && appliedEndDate) {
      const start = parseISO(appliedStartDate);
      const end = parseISO(appliedEndDate);
      dateMatch = bookingDate >= start && bookingDate <= end;
    }

    return searchMatch && roomMatch && dateMatch;
  });

  const handleBookingUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white rounded-lg shadow-lg p-4">
        <div>
      <label className="text-sm font-medium mb-1 block">Search</label>
      <div className="flex items-center w-full px-2 py-[7px] border rounded-md bg-white">
        <Search className="h-5 w-5 text-gray-400 mr-1" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="By name, ID, room"
          className="flex-1 border-0 focus:ring-0 focus:outline-none text-sm bg-transparent"
        />
      </div>
    </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Room</label>
          <input
            type="number"
            value={searchRoomNumber}
            onChange={(e) => setSearchRoomNumber(e.target.value)}
            className="w-full px-2 py-2 border rounded-md text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Booking Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-2 py-2 border rounded-md text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">
            {startDate ? "To Date" : "Checkout Date"}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-2 py-2 border rounded-md text-sm"
          />
        </div>

        <div className="flex items-end space-x-2">
          <button
            onClick={() => {
              setAppliedStartDate(startDate);
              setAppliedEndDate(endDate);
            }}
            className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 w-full"
          >
            Search
          </button>
          <button
            onClick={() => {
              setSearchTerm('');
              setSearchRoomNumber('');
              setStartDate('');
              setEndDate('');
              setAppliedStartDate('');
              setAppliedEndDate('');
            }}
            className="px-4 py-2 bg-gray-300 text-gray-800 text-sm rounded-md hover:bg-gray-400 w-full"
          >
            Clear
          </button>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-lg">
          <p className="text-gray-500">No bookings found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1">
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
                roomNumber={room?.roomNumber}
                variant={isSmallScreen ? "default" : "list"}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookingsList;
