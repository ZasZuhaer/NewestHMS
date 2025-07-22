import React, { useState } from 'react';
import { ArrowLeft, User, Phone, CreditCard, Calendar, Clock, Users, BedDouble, Plus, X } from 'lucide-react';
import { useBookingStore } from '../store/useBookingStore';
import { useGuestStore } from '../store/useGuestStore';
import { useRoomStore } from '../store/useRoomStore';
import { useAuthStore } from '../store/useAuthStore';
import { format, parseISO, addDays } from 'date-fns';
import toast from 'react-hot-toast';

interface BookingDetailsPageProps {
  bookingId: string;
  onBack: () => void;
  onUpdate?: () => void;
}

const BookingDetailsPage: React.FC<BookingDetailsPageProps> = ({ bookingId, onBack, onUpdate }) => {
  const { getBookingById, checkIn, checkOut, updateBooking, getCurrentBookingsForRoom, isRoomAvailable, requestCancellation, getCancellationRequestForBooking, cancelBooking } = useBookingStore();
  const { getGuestById, getAllGuests } = useGuestStore();
  const { getRoomById } = useRoomStore();
  const { getCurrentUserRole, currentUser } = useAuthStore();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [extraDays, setExtraDays] = useState('1');
  const [extraAmount, setExtraAmount] = useState('0');
  const [action, setAction] = useState<'checkIn' | 'checkOut' | null>(null);
  
  const booking = getBookingById(bookingId);
  const primaryGuest = booking ? getGuestById(booking.guestIds[0]) : null;
  const allBookingGuests = booking ? booking.guestIds.map(id => getGuestById(id)).filter(Boolean) : [];
  const room = booking ? getRoomById(booking.roomId) : null;
  const userRole = getCurrentUserRole();
  const cancellationRequest = booking ? getCancellationRequestForBooking(booking.id) : null;
  
  if (!booking || !primaryGuest || !room) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Booking, primary guest, or room not found</p>
        <button 
          onClick={onBack}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
      </div>
    );
  }
  
  const handleCheckIn = () => {
    const currentBookings = getCurrentBookingsForRoom(booking.roomId);
    if (currentBookings.length > 0) {
      toast.error('A guest is already checked in to this room');
      return;
    }
    
    setAction('checkIn');
    setPaidAmount(booking.paidAmount.toString());
    setShowPaymentModal(true);
  };
  
  const handleCheckOut = () => {
    setAction('checkOut');
    setPaidAmount(booking.paidAmount.toString());
    setShowPaymentModal(true);
  };

  const handleCancellation = () => {
    try {
      if (userRole === 'admin') {
        const success = cancelBooking(booking.id);
        if (success) {
          toast.success('Booking cancelled successfully');
          if (onUpdate) onUpdate();
        } else {
          toast.error('Failed to cancel booking');
        }
      } else if (userRole === 'manager' && currentUser) {
        const requestId = requestCancellation(booking.id, currentUser.id);
        if (requestId) {
          toast.success('Cancellation request submitted');
          if (onUpdate) onUpdate();
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process cancellation');
    }
  };

  const handleExtendBooking = () => {
    const parsedExtraDays = parseInt(extraDays);
    if (isNaN(parsedExtraDays) || parsedExtraDays < 1) {
      toast.error('Please enter a valid number of days (minimum 1)');
      return;
    }

    const parsedExtraAmount = parseFloat(extraAmount);
    if (isNaN(parsedExtraAmount) || parsedExtraAmount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const currentEndDate = addDays(parseISO(booking.bookingDate), booking.durationDays);
    const newEndDate = format(addDays(currentEndDate, parsedExtraDays), 'yyyy-MM-dd');

    if (!isRoomAvailable(
      booking.roomId,
      format(currentEndDate, 'yyyy-MM-dd'),
      newEndDate,
      booking.id
    )) {
      toast.error('Room is not available for the extended period');
      return;
    }

    const newDuration = booking.durationDays + parsedExtraDays;
    const newTotalAmount = booking.totalAmount + parsedExtraAmount;

    updateBooking(booking.id, {
      durationDays: newDuration,
      totalAmount: newTotalAmount
    });

    setShowExtendModal(false);
    if (onUpdate) onUpdate();
    toast.success('Booking duration extended successfully');
  };
  
  const handlePaymentConfirm = () => {
    const newPaidAmount = parseFloat(paidAmount);
    if (isNaN(newPaidAmount) || newPaidAmount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (newPaidAmount < booking.paidAmount) {
      toast.error('New paid amount must be greater than or equal to current paid amount');
      return;
    }

    if (newPaidAmount > booking.totalAmount) {
      toast.error('New paid amount must be less than or equal to total amount');
      return;
    }
    
    updateBooking(booking.id, { paidAmount: newPaidAmount });
    
    if (action === 'checkIn') {
      const success = checkIn(booking.id);
      if (success) {
        toast.success('Guest checked in successfully');
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to check in guest');
      }
    } else if (action === 'checkOut') {
      const success = checkOut(booking.id);
      if (success) {
        toast.success('Guest checked out successfully');
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to check out guest');
      }
    }
    
    setShowPaymentModal(false);
    setAction(null);
  };
  
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM/yyyy');
  };
  
  const formatDateTime = (dateTimeString: string) => {
    return format(parseISO(dateTimeString), 'dd/MM/yyyy hh:mm a');
  };
  
  const paymentStatus = booking.paidAmount >= booking.totalAmount 
    ? 'Paid in full' 
    : `Partially paid (${((booking.paidAmount / booking.totalAmount) * 100).toFixed(0)}%)`;
  
  const paymentStatusClass = booking.paidAmount >= booking.totalAmount
    ? 'bg-green-100 text-green-800'
    : 'bg-amber-100 text-amber-800';

  const getNewCheckoutDate = () => {
    const parsedExtraDays = parseInt(extraDays);
    if (isNaN(parsedExtraDays) || parsedExtraDays < 1) {
      return 'Please enter a valid number of days';
    }
    const currentEndDate = addDays(parseISO(booking.bookingDate), booking.durationDays);
    return format(addDays(currentEndDate, parsedExtraDays), 'dd/MM/yyyy');
  };

  const getStatusBadge = () => {
    if (booking.cancelledAt) {
      return <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">Cancelled</span>;
    }
    if (booking.checkOutDateTime) {
      return <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">Checked Out</span>;
    }
    if (booking.checkInDateTime) {
      return <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800">Currently Staying</span>;
    }
    return <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-amber-100 text-amber-800">Upcoming</span>;
  };
  
  return (
    <>
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
            
            <div className="flex items-center space-x-3">
              {getStatusBadge()}
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${paymentStatusClass}`}>
                {paymentStatus}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Booking Information */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Booking Details</h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <BedDouble className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Room</p>
                    <p className="font-medium">Room {room.roomNumber} - {room.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Booking Date</p>
                    <p className="font-medium">{formatDate(booking.bookingDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium">{booking.durationDays} days</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Number of People</p>
                    <p className="font-medium">{booking.numberOfPeople}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Payment</p>
                    <p className="font-medium">৳{booking.paidAmount} / ৳{booking.totalAmount}</p>
                  </div>
                </div>
                
                {booking.checkInDateTime && (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Check-in Time</p>
                      <p className="font-medium">{formatDateTime(booking.checkInDateTime)}</p>
                    </div>
                  </div>
                )}
                
                {booking.checkOutDateTime && (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Check-out Time</p>
                      <p className="font-medium">{formatDateTime(booking.checkOutDateTime)}</p>
                    </div>
                  </div>
                )}
                
                {booking.cancelledAt && (
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-red-800 font-medium">Booking Cancelled</p>
                    <p className="text-red-600 text-sm">
                      Cancelled on {formatDateTime(booking.cancelledAt)}
                    </p>
                  </div>
                )}
                
                {cancellationRequest?.status === 'pending' && (
                  <div className="bg-amber-50 p-4 rounded-md">
                    <p className="text-amber-800 font-medium">Cancellation Request Pending</p>
                    <p className="text-amber-600 text-sm">
                      Requested on {formatDateTime(cancellationRequest.requestedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Guest Information */}
            <div>
              <h2 className="text-2xl font-bold mb-6">
                Guest Information 
                {allBookingGuests.length > 1 && (
                  <span className="text-lg font-normal text-gray-600 ml-2">
                    ({allBookingGuests.length} guests)
                  </span>
                )}
              </h2>
              
              <div className="space-y-6">
                {allBookingGuests.length > 1 &&
                <h4 className="text-lg font-semibold mb-3 text-gray-700">Guest 1</h4>
                }
                {allBookingGuests.map((guest, index) => (
                  <div key={guest.id} className={`${index > 0 ? 'pt-1 border-t border-gray-200' : ''}`}>
                    {index > 0 && (
                      <h4 className="text-lg font-semibold mb-3 text-gray-700">Guest {index + 1}</h4>
                    )}
                    
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Guest Name</p>
                          <p className="font-medium">{guest.name}</p>
                        </div>
                      </div>
                      
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
                      
                      {guest.dateOfBirth && (
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 text-gray-500 mr-3" />
                          <div>
                            <p className="text-sm text-gray-600">Date of Birth</p>
                            <p className="font-medium">{formatDate(guest.dateOfBirth)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
                {!booking.checkInDateTime && !booking.cancelledAt && (
                  <>
                    <button
                      onClick={handleCheckIn}
                      className="btn btn-primary w-full"
                    >
                      Check In
                    </button>
                    
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <button
                        onClick={handleCancellation}
                        className="btn btn-danger w-full"
                        disabled={!!cancellationRequest?.status === 'pending'}
                      >
                        {userRole === 'admin' ? 'Cancel Booking' : 'Request Cancellation'}
                      </button>
                    )}
                  </>
                )}
                
                {booking.checkInDateTime && !booking.checkOutDateTime && (
                  <>
                    <button
                      onClick={() => setShowExtendModal(true)}
                      className="btn btn-secondary w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Extend Stay
                    </button>
                    <button
                      onClick={handleCheckOut}
                      className="btn btn-primary w-full bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                    >
                      Check Out
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {action === 'checkIn' ? 'Check-in Payment' : 'Check-out Payment'}
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setAction(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Total Amount: ৳{booking.totalAmount}</p>
                <p className="text-sm text-gray-600 mb-4">Currently Paid: ৳{booking.paidAmount}</p>
                
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Update Paid Amount
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  min={booking.paidAmount + 0.01}
                  step="0.01"
                  max={booking.totalAmount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setAction(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentConfirm}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extend Stay Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Extend Stay</h3>
              <button
                onClick={() => setShowExtendModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Days
                </label>
                <input
                  type="number"
                  value={extraDays}
                  onChange={(e) => setExtraDays(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Amount (৳)
                </label>
                <input
                  type="number"
                  value={extraAmount}
                  onChange={(e) => setExtraAmount(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div className="pt-4">
                <p className="text-sm text-gray-600">
                  New check-out date will be: {getNewCheckoutDate()}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowExtendModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtendBooking}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  Extend Stay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingDetailsPage;