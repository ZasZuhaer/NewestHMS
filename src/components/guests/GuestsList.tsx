import React, { useState } from 'react';
import { useGuestStore } from '../../store/useGuestStore';
import { useBookingStore } from '../../store/useBookingStore';
import { useRoomStore } from '../../store/useRoomStore';
import { User, Phone, CreditCard, Calendar, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface GuestsListProps {
  onSelectGuest: (guestId: string) => void;
}

const GuestsList: React.FC<GuestsListProps> = ({ onSelectGuest }) => {
  const { getAllGuests } = useGuestStore();
  const { getBookingsForGuest } = useBookingStore();
  const { getRoomById } = useRoomStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const guests = getAllGuests();
  
  const filteredGuests = guests.filter(guest => {
    if (!searchTerm) return true;

    
    const searchLower = searchTerm.toLowerCase();
    return (
      guest.name.toLowerCase().includes(searchLower) ||
      guest.nationalId.toLowerCase().includes(searchLower) ||
      guest.phone.toLowerCase().includes(searchLower)
    );
  });
  
const sortedGuests = [...filteredGuests].sort((a, b) => {
  const aBookings = getBookingsForGuest(a.id);
  const bBookings = getBookingsForGuest(b.id);

  // Helper to determine guest's booking category priority
  const getGuestPriority = (bookings: Booking[]) => {
    const activeBooking = bookings.find(b => b.checkInDateTime && !b.checkOutDateTime);
    if (activeBooking) return 1;

    const upcomingBooking = bookings.find(b => !b.checkInDateTime && !b.cancelledAt);
    if (upcomingBooking) return 2;

    const pastBooking = bookings.find(b => b.checkInDateTime && b.checkOutDateTime);
    if (pastBooking) return 3;

    const cancelledBooking = bookings.find(b => b.cancelledAt);
    if (cancelledBooking) return 4;

    return 5; // guests with no bookings
  };

  const priorityA = getGuestPriority(aBookings);
  const priorityB = getGuestPriority(bBookings);

  if (priorityA !== priorityB) return priorityA - priorityB;

  // Sub-sorting inside each group

  // 1️⃣ Currently staying (Active): newest check-in first
  if (priorityA === 1) {
    const aCheckIn = Math.max(...aBookings.filter(b => b.checkInDateTime && !b.checkOutDateTime).map(b => parseISO(b.checkInDateTime!).getTime()));
    const bCheckIn = Math.max(...bBookings.filter(b => b.checkInDateTime && !b.checkOutDateTime).map(b => parseISO(b.checkInDateTime!).getTime()));
    return bCheckIn - aCheckIn;
  }

  // 2️⃣ Upcoming: oldest bookingDate first
  if (priorityA === 2) {
    const aBookingDate = Math.min(...aBookings.filter(b => !b.checkInDateTime && !b.cancelledAt).map(b => parseISO(b.bookingDate).getTime()));
    const bBookingDate = Math.min(...bBookings.filter(b => !b.checkInDateTime && !b.cancelledAt).map(b => parseISO(b.bookingDate).getTime()));
    return aBookingDate - bBookingDate;
  }

  // 3️⃣ Past stays: newest check-out first
  if (priorityA === 3) {
    const aCheckout = Math.max(...aBookings.filter(b => b.checkOutDateTime).map(b => parseISO(b.checkOutDateTime!).getTime()));
    const bCheckout = Math.max(...bBookings.filter(b => b.checkOutDateTime).map(b => parseISO(b.checkOutDateTime!).getTime()));
    return bCheckout - aCheckout;
  }

  // 4️⃣ Cancelled: newest cancelledAt first
  if (priorityA === 4) {
    const aCancelled = Math.max(...aBookings.filter(b => b.cancelledAt).map(b => parseISO(b.cancelledAt!).getTime()));
    const bCancelled = Math.max(...bBookings.filter(b => b.cancelledAt).map(b => parseISO(b.cancelledAt!).getTime()));
    return bCancelled - aCancelled;
  }

  return 0;
});


  
  return (
    <div className="space-y-6">
      <div className="flex items-center bg-white rounded-lg shadow-lg p-2">
        <Search className="h-5 w-5 text-gray-400 ml-2 mr-1" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Name, ID or Phone..."
          className="input border-0 focus:ring-0"
        />
      </div>
      
      {sortedGuests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">No guests found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {sortedGuests.map(guest => {
            const bookings = getBookingsForGuest(guest.id);
            const activeBookings = bookings.filter(b => b.checkInDateTime && !b.checkOutDateTime);
            const pastBookings = bookings.filter(b => b.checkOutDateTime);
            const futureBookings = bookings.filter(b => !b.checkInDateTime && !b.cancelledAt);
            const cancelledBookings = bookings.filter(b => b.cancelledAt).length;

            return (
              <div 
                key={guest.id} 
                className="card card-hover cursor-pointer"
                onClick={() => onSelectGuest(guest.id)}
              >
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-3">{guest.name}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-700">{guest.nationalId}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-700">{guest.phone}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-700">
                        {bookings.length} Bookings{cancelledBookings > 0 && ` (${cancelledBookings} Cancelled)`}
                      </span>
                    </div>
                  </div>
                  
                  {activeBookings.length > 0 && (
                    <div className="bg-teal-50 p-3 rounded-md mb-3">
                      <p className="text-sm font-medium text-teal-800">Currently Staying</p>
                      <ul className="text-xs text-teal-700 space-y-1">
                        {activeBookings.slice(0, 2).map(booking => (
                          <li key={booking.id}>
                            Room: {getRoomById(booking.roomId)?.roomNumber}, Check-in: {format(parseISO(booking.checkInDateTime!), 'dd/MM/yyyy')}
                          </li>
                        ))}
                        {activeBookings.length > 2 && (
                          <li className="text-teal-700 font-medium">
                            + {activeBookings.length - 2} more currently staying
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  
                  {futureBookings.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-1">Upcoming Stays</h4>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {futureBookings.slice(0, 2).map(booking => (
                          <li key={booking.id}>
                            Room: {getRoomById(booking.roomId)?.roomNumber}, {format(parseISO(booking.bookingDate), 'dd/MM/yyyy')} 
                            ({booking.durationDays} days)
                          </li>
                        ))}
                        {futureBookings.length > 2 && (
                          <li className="text-teal-600 font-medium">
                            + {futureBookings.length - 2} more upcoming bookings
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {pastBookings.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Past Stays</h4>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {pastBookings.slice(0, 2).map(booking => (
                          <li key={booking.id}>
                            Room: {getRoomById(booking.roomId)?.roomNumber}, {format(parseISO(booking.bookingDate), 'dd/MM/yyyy')} 
                            ({booking.durationDays} days)
                          </li>
                        ))}
                        {pastBookings.length > 2 && (
                          <li className="text-gray-500 font-medium">
                            + {pastBookings.length - 2} more past bookings
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GuestsList;