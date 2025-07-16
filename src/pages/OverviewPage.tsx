import React, { useState } from 'react';
import RoomsList from '../components/overviewRooms/RoomsList';
import RoomDetails from '../components/rooms/RoomDetails';
import RoomFilters from '../components/rooms/RoomFilters';
import RoomForm from '../components/rooms/RoomForm';
import { Plus } from 'lucide-react';
import { RoomFilter } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

const OverviewPage: React.FC = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RoomFilter>({});
  
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
  };
  
  const handleBackToRooms = () => {
    setSelectedRoomId(null);
  };
  
  const handleCreateBookingFromRoom = (roomId: string) => {
    // In overview page, we don't have booking functionality
    // This is just to satisfy the interface
  };
    
  if (selectedRoomId) {
    return (
      <RoomDetails
        roomId={selectedRoomId}
        onBack={handleBackToRooms}
        onCreateBooking={handleCreateBookingFromRoom}
      />
    );
  }
  
  return (
    <div className="space-y-6">
      
      <RoomFilters onFilterChange={setFilter} />
      
      <RoomsList onSelectRoom={handleSelectRoom} filter={filter} />
 
    </div>
  );
};

export default OverviewPage;