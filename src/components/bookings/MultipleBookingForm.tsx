import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Guest } from '../../types';
import { useBookingStore } from '../../store/useBookingStore';
import { useGuestStore } from '../../store/useGuestStore';
import { useRoomStore } from '../../store/useRoomStore';
import { format, addDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface SelectedRoom {
  id: string;
  roomNumber: string;
  numberOfPeople: number;
}

interface MultipleBookingFormProps {
  onSubmit: () => void;
  onCancel: () => void;
  prefilledGuest?: Guest;
}

const MultipleBookingForm: React.FC<MultipleBookingFormProps> = ({ onSubmit, onCancel, prefilledGuest }) => {
  const { findOrCreateGuest, getAllGuests } = useGuestStore();
  const { getAllRooms } = useRoomStore();
  const { addBooking, isRoomAvailable } = useBookingStore();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [guestName, setGuestName] = useState(prefilledGuest?.name || '');
  const [nationalId, setNationalId] = useState(prefilledGuest?.nationalId || '');
  const [phone, setPhone] = useState(prefilledGuest?.phone || '');
  const [numberOfRooms, setNumberOfRooms] = useState('1');
  const [selectedRooms, setSelectedRooms] = useState<SelectedRoom[]>([]);
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [bookingDate, setBookingDate] = useState(today);
  const [durationDays, setDurationDays] = useState('1');
  
  const [availabilityErrors, setAvailabilityErrors] = useState<string[]>([]);
  
  const rooms = getAllRooms().sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.roomNumber.localeCompare(b.roomNumber);
  });
  
  // Update selected rooms when number of rooms changes
  useEffect(() => {
    const targetCount = parseInt(numberOfRooms) || 1;
    const currentCount = selectedRooms.length;
    
    if (targetCount > currentCount) {
      // Add more rooms
      const availableRooms = rooms.filter(room => 
        !selectedRooms.some(selected => selected.id === room.id)
      );
      
      const roomsToAdd = targetCount - currentCount;
      const newRooms: SelectedRoom[] = [];
      
      for (let i = 0; i < roomsToAdd && i < availableRooms.length; i++) {
        const room = availableRooms[i];
        newRooms.push({
          id: room.id,
          roomNumber: room.roomNumber,
          numberOfPeople: 1
        });
      }
      
      setSelectedRooms([...selectedRooms, ...newRooms]);
    } else if (targetCount < currentCount) {
      // Remove excess rooms
      setSelectedRooms(selectedRooms.slice(0, targetCount));
    }
  }, [numberOfRooms, rooms]);
  
  // Auto-fill guest information when National ID matches
  useEffect(() => {
    if (prefilledGuest) return; // Don't auto-fill if guest is already prefilled
    
    if (nationalId.length > 0) {
      const existingGuest = getAllGuests().find(guest => guest.nationalId === nationalId);
      if (existingGuest) {
        setGuestName(existingGuest.name);
        setPhone(existingGuest.phone);
      }
    }
  }, [nationalId, getAllGuests, prefilledGuest]);
  
  // Calculate end date based on booking date and duration
  const endDate = durationDays && bookingDate 
    ? format(addDays(parseISO(bookingDate), parseInt(durationDays, 10)), 'yyyy-MM-dd')
    : '';
  
  // Check room availability when booking date, duration, or selected rooms change
  useEffect(() => {
    if (bookingDate && durationDays && selectedRooms.length > 0) {
      const endDateValue = format(addDays(parseISO(bookingDate), parseInt(durationDays, 10)), 'yyyy-MM-dd');
      const errors: string[] = [];
      
      selectedRooms.forEach(room => {
        if (!isRoomAvailable(room.id, bookingDate, endDateValue)) {
          errors.push(`Room ${room.roomNumber} is not available for the selected dates`);
        }
      });
      
      setAvailabilityErrors(errors);
    } else {
      setAvailabilityErrors([]);
    }
  }, [bookingDate, durationDays, selectedRooms, isRoomAvailable]);

  const handleRoomChange = (index: number, roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    
    const updatedRooms = [...selectedRooms];
    updatedRooms[index] = {
      id: roomId,
      roomNumber: room.roomNumber,
      numberOfPeople: updatedRooms[index].numberOfPeople
    };
    setSelectedRooms(updatedRooms);
  };

  const handlePeopleChange = (index: number, numberOfPeople: number) => {
    const updatedRooms = [...selectedRooms];
    updatedRooms[index].numberOfPeople = numberOfPeople;
    setSelectedRooms(updatedRooms);
  };

  const getTotalPeople = () => {
    return selectedRooms.reduce((total, room) => total + room.numberOfPeople, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (availabilityErrors.length > 0) {
      toast.error('Please resolve room availability issues');
      return;
    }
    
    if (!guestName || !nationalId || !phone || !bookingDate || !durationDays || !totalAmount) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (selectedRooms.length === 0) {
      toast.error('Please select at least one room');
      return;
    }
    
    // Check for duplicate rooms
    const roomIds = selectedRooms.map(room => room.id);
    const uniqueRoomIds = new Set(roomIds);
    if (roomIds.length !== uniqueRoomIds.size) {
      toast.error('Cannot select the same room multiple times');
      return;
    }
    
    // Create or find guest
    const guestId = findOrCreateGuest({
      name: guestName,
      nationalId,
      phone,
    });

    // Create separate booking for each room
    const totalAmountNum = parseFloat(totalAmount);
    const paidAmountNum = paidAmount ? parseFloat(paidAmount) : 0;
    const amountPerRoom = totalAmountNum / selectedRooms.length;
    const paidPerRoom = paidAmountNum / selectedRooms.length;

    let successCount = 0;
    
    selectedRooms.forEach(room => {
      try {
        addBooking({
          roomId: room.id,
          guestId,
          guestName,
          nationalId,
          phone,
          numberOfPeople: room.numberOfPeople,
          totalAmount: amountPerRoom,
          paidAmount: paidPerRoom,
          bookingDate,
          durationDays: parseInt(durationDays, 10),
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to create booking for room ${room.roomNumber}:`, error);
      }
    });
    
    if (successCount === selectedRooms.length) {
      toast.success(`Successfully created ${successCount} bookings`);
      onSubmit();
    } else if (successCount > 0) {
      toast.success(`Created ${successCount} out of ${selectedRooms.length} bookings`);
      onSubmit();
    } else {
      toast.error('Failed to create any bookings');
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onCancel}
          className="mr-2 p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold">{prefilledGuest ? `Create Bookings for ${prefilledGuest.name}` : 'Create Bookings'}</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Guest Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-4">Guest Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700 mb-1">
                Guest ID*
              </label>
              <input
                type="text"
                id="nationalId"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                disabled={!!prefilledGuest}
                required
              />
            </div>
            
            <div>
              <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-1">
                Guest Name*
              </label>
              <input
                type="text"
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                disabled={!!prefilledGuest}
                required
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number*
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                disabled={!!prefilledGuest}
                required
              />
            </div>
          </div>
        </div>

        {/* Room Selection */}
        <div>
          <div className="mb-4">
            <h3 className="font-medium mb-4">Room Selection*</h3>
            
            <div className="mb-4">
              <label htmlFor="numberOfRooms" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Rooms*
              </label>
              <input
                type="number"
                id="numberOfRooms"
                value={numberOfRooms}
                onChange={(e) => setNumberOfRooms(e.target.value)}
                min="1"
                max="10"
                placeholder="Enter number of rooms"
                className="w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                required
              />
            </div>
          </div>
          
          <div className="space-y-3">
            {Array.from({ length: parseInt(numberOfRooms) || 1 }, (_, index) => {
              const selectedRoom = selectedRooms[index];
              return (
                <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-16 text-sm font-medium text-gray-700 flex items-center justify-center">
                    Room {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Room
                    </label>
                    <select
                      value={selectedRoom?.id || ''}
                      onChange={(e) => handleRoomChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                      required
                    >
                      <option value="">Select Room</option>
                      {rooms
                        .filter(room => 
                          room.id === selectedRoom?.id || 
                          !selectedRooms.some(selected => selected?.id === room.id)
                        )
                        .map(room => (
                          <option key={room.id} value={room.id}>
                            Room {room.roomNumber} - {room.category} ({room.beds} beds)
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      People
                    </label>
                    <input
                      type="number"
                      value={selectedRoom?.numberOfPeople || 1}
                      onChange={(e) => handlePeopleChange(index, parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                      required
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {selectedRooms.length > 0 && (
            <div className="mt-3 text-sm text-gray-600">
              Total People: {getTotalPeople()}
            </div>
          )}
        </div>

        {/* Booking Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Total Amount (All Rooms)*
            </label>
            <input
              type="number"
              id="totalAmount"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required
            />
            {selectedRooms.length > 0 && totalAmount && (
              <p className="text-xs text-gray-500 mt-1">
                ৳{(parseFloat(totalAmount) / selectedRooms.length).toFixed(2)} per room
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="paidAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Paid Amount (All Rooms)
            </label>
            <input
              type="number"
              id="paidAmount"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              min="0"
              step="1"
              max={totalAmount || undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            />
            {selectedRooms.length > 0 && paidAmount && (
              <p className="text-xs text-gray-500 mt-1">
                ৳{(parseFloat(paidAmount) / selectedRooms.length).toFixed(2)} per room
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="bookingDate" className="block text-sm font-medium text-gray-700 mb-1">
              Booking Date*
            </label>
            <input
              type="date"
              id="bookingDate"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              min={today}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="durationDays" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (Days)*
            </label>
            <input
              type="number"
              id="durationDays"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
        </div>
        
        {endDate && (
          <div className="bg-blue-50 p-3 rounded-md text-blue-800">
            <p>Check-out date will be: <strong>{format(parseISO(endDate), 'dd/MM/yyyy')}</strong></p>
          </div>
        )}
        
        {availabilityErrors.length > 0 && (
          <div className="bg-red-50 p-3 rounded-md text-red-800">
            <ul className="list-disc list-inside">
              {availabilityErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={availabilityErrors.length > 0 || selectedRooms.length !== parseInt(numberOfRooms)}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-gray-400"
          >
            Create {numberOfRooms} Booking{parseInt(numberOfRooms) !== 1 ? 's' : ''}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MultipleBookingForm;