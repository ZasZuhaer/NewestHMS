import React, { useState, useMemo } from 'react';
import { Room, RoomCategory, RoomFilter } from '../../types';
import RoomCard from './RoomCard';
import { useRoomStore } from '../../store/useRoomStore';
import { useBookingStore } from '../../store/useBookingStore';
import { format, addDays, parseISO, isWithinInterval } from 'date-fns';

interface RoomsListProps {
  onSelectRoom: (roomId: string) => void;
  filter: RoomFilter;
}

const RoomsList: React.FC<RoomsListProps> = ({ onSelectRoom, filter }) => {
  const { getAllRooms, getRoomsByCategory } = useRoomStore();
  const { getBookingsForRoom, isRoomAvailable } = useBookingStore();
  
  const today = new Date();
  const formattedToday = format(today, 'yyyy-MM-dd');
  const formattedTomorrow = format(addDays(today, 1), 'yyyy-MM-dd');

  // Use filter dates if provided, otherwise use today/tomorrow
  const startDate = filter.startDate || formattedToday;
  const endDate = filter.endDate || formattedTomorrow;

  const filteredRooms = useMemo(() => {
    let rooms = filter.category ? getRoomsByCategory(filter.category) : getAllRooms();
    
    return rooms.sort((a, b) => {
      // Sort by floor first
      if (a.floor !== b.floor) {
        return a.floor - b.floor;
      }
      // Then by room number
      return a.roomNumber.localeCompare(b.roomNumber);
    });
  }, [getAllRooms, getRoomsByCategory, filter.category]);

  // Separate available and occupied/booked rooms based on date filter
  const { availableRooms, occupiedOrBookedRooms } = useMemo(() => {
    const available: Room[] = [];
    const occupiedOrBooked: { room: Room; overlappingBooking?: Booking }[] = [];

    filteredRooms.forEach(room => {
      const bookings = getBookingsForRoom(room.id);
      const isAvailable = isRoomAvailable(room.id, startDate, endDate);
      
      // Find active or future booking for the filtered period
      const overlappingBooking = bookings.find(booking => {
        if (booking.checkOutDateTime) return false; // Skip checked-out bookings
        if (booking.cancelledAt) return false; // Skip cancelled bookings

        const bookingStart = parseISO(booking.bookingDate);
        const bookingEnd = addDays(bookingStart, booking.durationDays -1);
        const filterStart = parseISO(startDate);
        const filterEnd = parseISO(endDate);
        
        return isWithinInterval(filterStart, { start: bookingStart, end: bookingEnd }) ||
               isWithinInterval(filterEnd, { start: bookingStart, end: bookingEnd }) ||
               (filterStart <= bookingStart && filterEnd >= bookingEnd);
      });
      
      if (isAvailable || !overlappingBooking) {
        available.push(room);
      } else {
        occupiedOrBooked.push({
          room,
          overlappingBooking
        });
      }
    });

    return { 
      availableRooms: available, 
      occupiedOrBookedRooms: occupiedOrBooked 
    };
  }, [filteredRooms, getBookingsForRoom, isRoomAvailable, startDate, endDate]);

  if (filteredRooms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No rooms found with the selected criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 md:grid-cols-12 gap-2">
      {filteredRooms.map((room) => {
        const isAvailable = availableRooms.includes(room);
        const overlappingData = occupiedOrBookedRooms.find(r => r.room.id === room.id);
        const currentBooking = overlappingData?.overlappingBooking;
  
        return (
          <RoomCard
            key={room.id}
            room={room}
            currentBooking={currentBooking}
            isAvailable={isAvailable}
            onClick={() => onSelectRoom(room.id)}
          />
        );
      })}
    </div>
  );

};

export default RoomsList;