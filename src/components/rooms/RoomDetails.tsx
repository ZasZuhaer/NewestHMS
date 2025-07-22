import React, { useState } from 'react';
import { Room, UserRole, Booking } from '../../types';
import { ArrowLeft, BedDouble, Droplets, Thermometer, Edit, Trash, AlertTriangle, Plus } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { useBookingStore } from '../../store/useBookingStore';
import { useAuthStore } from '../../store/useAuthStore';
import BookingCard from '../bookings/BookingCard';
import RoomForm from './RoomForm';
import { format, parseISO, addDays } from 'date-fns';
import toast from 'react-hot-toast';

interface RoomDetailsProps {
  roomId: string;
  onBack: () => void;
  onCreateBooking?: (roomId: string) => void;
  onDeleted?: () => void;
}

const RoomDetails: React.FC<RoomDetailsProps> = ({ roomId, onBack, onCreateBooking, onDeleted }) => {
  const { getRoomById, deleteRoom } = useRoomStore();
  const { getBookingsForRoom, getCurrentBookingsForRoom, getFutureBookingsForRoom } = useBookingStore();
  const { getCurrentUserRole } = useAuthStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  
  const room = getRoomById(roomId);
  const currentBookings = getCurrentBookingsForRoom(roomId);
  const futureBookings = getFutureBookingsForRoom(roomId);
  const userRole = getCurrentUserRole();
  const isAdmin = userRole === 'admin';
  const activeCurrentBookings = currentBookings.filter(b => !b.cancelledAt);
  const activeFutureBookings = futureBookings
    .filter(b => !b.cancelledAt)
    .sort((a, b) => {
      const aBookingDate = parseISO(a.bookingDate).getTime();
      const bBookingDate = parseISO(b.bookingDate).getTime();
      return aBookingDate - bBookingDate;
    });

  
  if (!room) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Room not found</p>
        <button 
          onClick={onBack}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Rooms
        </button>
      </div>
    );
  }
  
  const handleDelete = () => {
    if (currentBookings.length > 0) {
      toast.error("Cannot delete a room with active bookings");
      setIsConfirmingDelete(false);
      return;
    }
    
    if (futureBookings.length > 0) {
      toast.error("Cannot delete a room with future bookings");
      setIsConfirmingDelete(false);
      return;
    }
    
    const deleted = deleteRoom(roomId);
    if (deleted) {
      toast.success("Room deleted successfully");
      if (onDeleted) onDeleted();
      onBack();
    } else {
      toast.error("Failed to delete room");
    }
  };
  
  const handleBookingClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
  };
  
  const handleRoomUpdated = () => {
    setIsEditing(false);
    toast.success("Room updated successfully");
  };
  
  const handleCreateBooking = () => {
    if (onCreateBooking) {
      onCreateBooking(roomId);
    }
  };

  const handleBookingUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setIsEditing(false)}
            className="mr-2 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold">Edit Room {room.roomNumber}</h2>
        </div>
        
        <RoomForm 
          initialRoom={room} 
          onSubmit={handleRoomUpdated} 
          onCancel={() => setIsEditing(false)} 
        />
      </div>
    );
  }
  
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
          
          {isAdmin && (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-teal-600"
                aria-label="Edit Room"
              >
                <Edit className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-red-600"
                aria-label="Delete Room"
                disabled={currentBookings.length > 0 || futureBookings.length > 0}
              >
                <Trash className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Room {room.roomNumber}</h2>
            <p className="text-gray-600 mb-4">Floor {room.floor}</p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                <BedDouble className="h-6 w-6 text-gray-700 mb-1" />
                <span className="text-sm text-gray-600">{room.beds} {room.beds > 1 ? 'Beds' : 'Bed'}</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                <Droplets className="h-6 w-6 text-gray-700 mb-1" />
                <span className="text-sm text-gray-600">{room.bathrooms} Bath</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                <Thermometer className="h-6 w-6 text-gray-700 mb-1" />
                <span className="text-sm text-gray-600">{room.hasAC ? 'AC' : 'No AC'}</span>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-2">Category</h3>
              <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                {room.category}
              </span>
            </div>
            
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{room.description}</p>
            </div>
            
            {room.problems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-semibold mb-2 flex items-center text-red-600">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Issues
                </h3>
                <ul className="list-disc list-inside text-gray-700">
                  {room.problems.map((problem, index) => (
                    <li key={index}>{problem}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Current & Future Bookings</h3>
              
              <button
                onClick={handleCreateBooking}
                className="inline-flex items-center px-3 py-1.5 text-sm border border-transparent rounded-md shadow-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Booking
              </button>
            </div>
            
            <div className="space-y-4">
              {activeCurrentBookings.length === 0 && activeFutureBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No current or future bookings</p>
              ) : (
                <>
                  {activeCurrentBookings.map(booking => (
                    <BookingCard 
                      key={`${booking.id}-${refreshKey}`}
                      booking={booking} 
                      
                      isActive={true}
                      onUpdate={handleBookingUpdated}
                      onClick={() => handleBookingClick(booking.id)}
                    />
                  ))}
                  
                  {activeFutureBookings.map(booking => (
                    <BookingCard 
                      key={`${booking.id}-${refreshKey}`}
                      booking={booking}
                      isActive={false}
                      onUpdate={handleBookingUpdated}
                      onClick={() => handleBookingClick(booking.id)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isConfirmingDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Confirm Deletion</h3>
            <p className="mb-6">Are you sure you want to delete Room {room.roomNumber}? This action cannot be undone.</p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomDetails;