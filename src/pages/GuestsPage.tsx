import React from 'react';
import { useState } from 'react';
import GuestsList from '../components/guests/GuestsList';
import GuestDetails from '../components/guests/GuestDetails';

const GuestsPage: React.FC = () => {
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  
  const handleSelectGuest = (guestId: string) => {
    setSelectedGuestId(guestId);
  };
  
  const handleBackToGuests = () => {
    setSelectedGuestId(null);
  };
  
  if (selectedGuestId) {
    return (
      <GuestDetails
        guestId={selectedGuestId}
        onBack={handleBackToGuests}
      />
    );
  }
  
  return (
    <div className="space-y-6">
      <GuestsList onSelectGuest={handleSelectGuest} />
    </div>
  );
};

export default GuestsPage;