import React from 'react';
import MultipleBookingForm from '../components/bookings/MultipleBookingForm';

interface MultipleBookingPageProps {
  onSubmit: () => void;
  onCancel: () => void;
}

const MultipleBookingPage: React.FC<MultipleBookingPageProps> = ({ onSubmit, onCancel }) => {
  return (
    <div className="space-y-6">
      <MultipleBookingForm onSubmit={onSubmit} onCancel={onCancel} />
    </div>
  );
};

export default MultipleBookingPage;