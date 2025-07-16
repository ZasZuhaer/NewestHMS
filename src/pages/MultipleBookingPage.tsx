import React from 'react';
import MultipleBookingForm from '../components/bookings/MultipleBookingForm';

interface MultipleBookingPageProps {
  onSubmit: () => void;
  onCancel: () => void;
  preselectedRoomId?: string;
}

const MultipleBookingPage: React.FC<MultipleBookingPageProps> = ({ onSubmit, onCancel, preselectedRoomId }) => {
  return (
    <div className="space-y-6">
      <MultipleBookingForm 
        onSubmit={onSubmit} 
        onCancel={onCancel} 
        preselectedRoomId={preselectedRoomId}
      />
    </div>
  );
};

export default MultipleBookingPage;