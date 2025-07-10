import React, { useState } from 'react';
import { Guest, Booking } from '../../types';
import { ArrowLeft, User, Phone, CreditCard, Calendar } from 'lucide-react';
import { useGuestStore } from '../../store/useGuestStore';
import { useBookingStore } from '../../store/useBookingStore';
import { useRoomStore } from '../../store/useRoomStore';
import BookingCard from '../bookings/BookingCard';
import { format, parseISO } from 'date-fns';

interface GuestDetailsProps {
  guestId: string;
  onBack: () => void;
}

const GuestDetails: React.FC<GuestDetailsProps> = ({ guestId, onBack }) => {
  const { getGuestById } = useGuestStore();
  const { getBookingsForGuest } = useBookingStore();
  const { getRoomById } = useRoomStore();
  const [refreshKey, setRefreshKey] = useState(0);
  
  const guest = getGuestById(guestId);
  const allBookings = getBookingsForGuest(guestId);
  
  if (!guest) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Guest not found</p>
        <button 
          onClick={onBack}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Guests
        </button>
      </div>
    );
  }

  // Categorize bookings
  const currentBookings = allBookings.filter(b => b.checkInDateTime && !b.checkOutDateTime && !b.cancelledAt);
  const futureBookings = allBookings.filter(b => !b.checkInDateTime && !b.cancelledAt);
  const pastBookings = allBookings.filter(b => b.checkOutDateTime && !b.cancelledAt);
  const cancelledBookings = allBookings.filter(b => b.cancelledAt);

  // Sort bookings within each category
  const sortedCurrentBookings = currentBookings.sort((a, b) => 
    new Date(b.checkInDateTime!).getTime() - new Date(a.checkInDateTime!).getTime()
  );
  
  const sortedFutureBookings = futureBookings.sort((a, b) => 
    new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
  );
  
  const sortedPastBookings = pastBookings.sort((a, b) => 
    new Date(b.checkOutDateTime!).getTime() - new Date(a.checkOutDateTime!).getTime()
  );
  
  const sortedCancelledBookings = cancelledBookings.sort((a, b) => 
    new Date(b.cancelledAt!).getTime() - new Date(a.cancelledAt!).getTime()
  );

  const handleBookingUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const totalSpent = allBookings
    .filter(b => !b.cancelledAt)
    .reduce((total, booking) => total + booking.paidAmount, 0);

  const totalBookings = allBookings.length;
  const completedStays = pastBookings.length;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Guest Information */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-teal-100 p-3 rounded-full mr-4">
                  <User className="h-8 w-8 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{guest.name}</h2>
                  <p className="text-gray-600">Guest Profile</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Guest ID</p>
                    <p className="font-medium">{guest.nationalId}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="font-medium">{guest.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Total Bookings</p>
                    <p className="font-medium">{totalBookings}</p>
                  </div>
                </div>
              </div>
              
              {/* Statistics */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-teal-600">{completedStays}</p>
                    <p className="text-sm text-gray-600">Completed Stays</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-green-600">৳{totalSpent}</p>
                    <p className="text-sm text-gray-600">Total Spent</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bookings */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-semibold mb-6">Booking History</h3>
            
            <div className="space-y-6">
              {/* Current Bookings */}
              {sortedCurrentBookings.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium mb-3 flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                    Currently Staying ({sortedCurrentBookings.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedCurrentBookings.map(booking => {
                      const room = getRoomById(booking.roomId);
                      return (
                        <BookingCard
                          key={`${booking.id}-${refreshKey}`}
                          booking={booking}
                          isActive={true}
                          showRoom={true}
                          roomNumber={room?.roomNumber}
                          onUpdate={handleBookingUpdated}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Future Bookings */}
              {sortedFutureBookings.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium mb-3 flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                    Upcoming Bookings ({sortedFutureBookings.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedFutureBookings.map(booking => {
                      const room = getRoomById(booking.roomId);
                      return (
                        <BookingCard
                          key={`${booking.id}-${refreshKey}`}
                          booking={booking}
                          isActive={false}
                          showRoom={true}
                          roomNumber={room?.roomNumber}
                          onUpdate={handleBookingUpdated}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Past Bookings */}
              {sortedPastBookings.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium mb-3 flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    Past Stays ({sortedPastBookings.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedPastBookings.map(booking => {
                      const room = getRoomById(booking.roomId);
                      return (
                        <BookingCard
                          key={`${booking.id}-${refreshKey}`}
                          booking={booking}
                          isActive={false}
                          showRoom={true}
                          roomNumber={room?.roomNumber}
                          onUpdate={handleBookingUpdated}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Cancelled Bookings */}
              {sortedCancelledBookings.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium mb-3 flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-500 mr-2"></span>
                    Cancelled Bookings ({sortedCancelledBookings.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedCancelledBookings.map(booking => {
                      const room = getRoomById(booking.roomId);
                      return (
                        <BookingCard
                          key={`${booking.id}-${refreshKey}`}
                          booking={booking}
                          isActive={false}
                          showRoom={true}
                          roomNumber={room?.roomNumber}
                          onUpdate={handleBookingUpdated}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* No Bookings */}
              {allBookings.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No bookings found for this guest</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestDetails;