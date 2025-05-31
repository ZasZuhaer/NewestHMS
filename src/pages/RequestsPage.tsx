import React from 'react';
import { useBookingStore } from '../store/useBookingStore';
import { useAuthStore } from '../store/useAuthStore';
import { useRoomStore } from '../store/useRoomStore';
import { format, parseISO } from 'date-fns';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const RequestsPage: React.FC = () => {
  const { getCancellationRequests, approveCancellation, rejectCancellation, getBookingById } = useBookingStore();
  const { currentUser } = useAuthStore();
  const { getRoomById } = useRoomStore();
  
  const requests = getCancellationRequests().sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  
  const handleApprove = (requestId: string) => {
    if (!currentUser) return;
    
    const success = approveCancellation(requestId, currentUser.id);
    if (success) {
      toast.success('Cancellation request approved');
    } else {
      toast.error('Failed to approve cancellation request');
    }
  };
  
  const handleReject = (requestId: string) => {
    if (!currentUser) return;
    
    const success = rejectCancellation(requestId, currentUser.id);
    if (success) {
      toast.success('Cancellation request rejected');
    } else {
      toast.error('Failed to reject cancellation request');
    }
  };
  
  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No cancellation requests found</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {requests.map(request => {
          const booking = getBookingById(request.bookingId);
          if (!booking) return null;
          
          const room = getRoomById(booking.roomId);
          if (!room) return null;
          
          return (
            <div key={request.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    Cancellation Request for Room {room.roomNumber}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Requested on {format(parseISO(request.requestedAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  request.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                  request.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {request.status === 'approved' 
                    ? 'Cancelled' 
                    : request.status === 'rejected' 
                    ? 'Not Cancelled' 
                    : 'Pending'}

                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Booking Details</h4>
                  <p className="text-sm">Guest: {booking.guestName}</p>
                  <p className="text-sm">Check-in: {format(parseISO(booking.bookingDate), 'dd/MM/yyyy')}</p>
                  <p className="text-sm">Duration: {booking.durationDays} days</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Room Details</h4>
                  <p className="text-sm">Number: {room.roomNumber}</p>
                  <p className="text-sm">Category: {room.category}</p>
                  <p className="text-sm">Floor: {room.floor}</p>
                </div>
              </div>
              
              {request.status === 'pending' && (
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => handleReject(request.id)}
                    className="btn btn-secondary"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(request.id)}
                    className="btn btn-primary"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </button>
                </div>
              )}
              
              {request.resolvedAt && (
                <p className="text-sm text-gray-600 mt-4">
                  {request.status === 'approved' ? 'Cancelled' : 'Cancellation Rejected'} on{' '}
                  {format(parseISO(request.resolvedAt), 'dd/MM/yyyy HH:mm')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RequestsPage;