import React from 'react';
import BookingsList from '../components/bookings/BookingsList';

const BookingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <BookingsList />
    </div>
  );
};

export default BookingsPage;