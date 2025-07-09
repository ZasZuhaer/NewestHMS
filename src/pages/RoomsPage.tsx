import React, { useState } from 'react';
import RoomsList from '../components/rooms/RoomsList';
import RoomDetails from '../components/rooms/RoomDetails';
import RoomFilters from '../components/rooms/RoomFilters';
import RoomForm from '../components/rooms/RoomForm';
import { Plus } from 'lucide-react';
import { RoomFilter } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

const RoomsPage: React.FC = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [filter, setFilter] = useState<RoomFilter>({});
  const { getCurrentUserRole } = useAuthStore();
  
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
  };
  
  const handleBackToRooms = () => {
    setSelectedRoomId(null);
  };
  
  const handleAddRoom = () => {
    setIsAddingRoom(true);
  };
  
  const handleRoomAdded = () => {
    setIsAddingRoom(false);
    toast.success('Room added successfully');
  };
  
  const isAdmin = getCurrentUserRole() === 'admin';
  
  if (isAddingRoom) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-6">Add New Room</h2>
          <RoomForm
            onSubmit={handleRoomAdded}
            onCancel={() => setIsAddingRoom(false)}
          />
        </div>
      </div>
    );
  }
  
  if (selectedRoomId) {
    return (
      <RoomDetails
        roomId={selectedRoomId}
        onBack={handleBackToRooms}
      />
    );
  }
  
  return (
    <div className="space-y-6">
      
      <RoomFilters onFilterChange={setFilter} />
      
      <RoomsList onSelectRoom={handleSelectRoom} filter={filter} />

      {isAdmin && (
        <button
          onClick={handleAddRoom}
          className="fixed bottom-6 right-56 z-50 inline-flex items-center px-4 py-2 rounded-full shadow-2xl text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Room
        </button>
      )}
 
    </div>
  );
};

export default RoomsPage;