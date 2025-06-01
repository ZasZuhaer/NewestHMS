import React, { useState } from 'react';
import { Booking } from '../../types';
import { User, Calendar, Clock, CreditCard, Users, X, Plus } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { useBookingStore } from '../../store/useBookingStore';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

interface BookingCardProps {
  booking: Booking;
  isActive: boolean;
  showRoom?: boolean;
  roomNumber?: string;
  onUpdate?: () => void;
  variant?: 'default' | 'list';  // ✅ new prop
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  isActive,
  showRoom = false,
  roomNumber,
  onUpdate,
  variant = 'default', // ✅ default value
}) => {
  const { checkIn, checkOut, updateBooking, getCurrentBookingsForRoom, isRoomAvailable, requestCancellation, getCancellationRequestForBooking, cancelBooking } = useBookingStore();
  const { getCurrentUserRole, currentUser } = useAuthStore();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [paidAmount, setPaidAmount] = useState(booking.paidAmount.toString());
  const [extraDays, setExtraDays] = useState('1');
  const [extraAmount, setExtraAmount] = useState('0');
  const [action, setAction] = useState<'checkIn' | 'checkOut' | null>(null);
  
  const userRole = getCurrentUserRole();
  
  const cancellationRequest = getCancellationRequestForBooking(booking.id);
  
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
    return format(parseISO(dateTimeString), 'dd/MM/yyyy HH:mm');
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
  
  return (
    <>
      <div className={`card border w-full ${isActive ? 'border-teal-300 bg-teal-50' : 'border-gray-200'} ${variant === 'list' ? 'p-2' : 'p-3'}`}>


{variant === 'list' ? (
<>
  <div className="flex w-full justify-between items-center">



    {/* LEFT SIDE: All Info */}
    <div className="grid grid-cols-3 gap-1 items-center w-full">

    <div className="flex flex-col gap-1">
      <h3 className="text-md font-semibold">{booking.guestName}</h3>
    
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <User className="w-5 h-5 text-gray-400" />
        <span>ID: {booking.nationalId}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-600">
  <Users className="w-5 h-5 text-gray-400" />
  <span>{booking.numberOfPeople} {booking.numberOfPeople > 1 ? 'Guests' : 'Guest'}</span>
</div>
    </div>

       

    <div className="flex flex-col gap-1">

      <h3 className="text-md font-semibold">Room {roomNumber ?? booking.roomId}</h3>
      
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <Calendar className="w-5 h-5 text-gray-400" /> 
        <span>{formatDate(booking.bookingDate)} ({booking.durationDays} days)</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-900"> 
  <CreditCard className="w-5 h-5 text-gray-400" />
  <span>৳{booking.paidAmount} / ৳{booking.totalAmount}</span>
</div>
    </div> 

          <div className="flex flex-col gap-1">
          {booking.checkInDateTime && (
            <div className="flex items-center text-xs text-gray-600 mt-2">
              <Clock className="h-3 w-3 mr-1" />
              <span>Checked in: {formatDateTime(booking.checkInDateTime)}</span>
            </div>
          )}

          {booking.checkOutDateTime && (
            <div className="flex items-center text-xs text-gray-600 mt-0">
              <Clock className="h-3 w-3 mr-1" />
              <span>Checked out: {formatDateTime(booking.checkOutDateTime)}</span>
            </div>
          )}

          {cancellationRequest?.status === 'pending' && (
        <div className="flex ml-auto items-center justify-center bg-amber-100 text-amber-800 px-1 py-1 rounded-md text-xs">
          Cancellation request pending
        </div> 
      )}
            
          
          </div>
    


    </div>

    
    {/* RIGHT SIDE: Buttons stacked vertically */}
    <div className="flex grid-col-1 gap-1 ml-auto">
      {!booking.checkInDateTime && !booking.cancelledAt && (
        <div className="flex flex-col items-center gap-1">
  <button onClick={handleCheckIn} className="btn btn-primary w-28">Check In</button>

  {(userRole === 'admin' || userRole === 'manager') && (
    <button onClick={handleCancellation} className="btn btn-danger w-28" disabled={!!cancellationRequest?.status === 'pending'}>
      {userRole === 'admin' ? 'Cancel' : 'Cancel'}
    </button>
  )}
</div>

      )} 

      {booking.checkInDateTime && !booking.checkOutDateTime && (
        <>
          <button onClick={() => setShowExtendModal(true)} className="btn btn-secondary w-28">Extend</button>
          <button onClick={handleCheckOut} className="btn btn-primary bg-blue-600 w-28">Check Out</button>
        </>
      )}
      
    </div>
  </div>
</>



  ) : (
    <>
      {/* Your existing layout — keep as is */}

          
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-semibold">{booking.guestName}</h3>
              {showRoom && (
                <p className="text-sm text-gray-600">
                  Room {roomNumber ?? booking.roomId}
                </p>
              )}
            </div>
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${paymentStatusClass}`}>
              {paymentStatus}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center text-sm text-gray-700">
              <User className="h-4 w-4 mr-1 text-gray-500" />
              <span>ID: {booking.nationalId}</span>
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <Users className="h-4 w-4 mr-1 text-gray-500" />
              <span>{booking.numberOfPeople} {booking.numberOfPeople > 1 ? 'Guests' : 'Guest'}</span>
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <Calendar className="h-4 w-4 mr-1 text-gray-500" />
              <span>{formatDate(booking.bookingDate)} ({booking.durationDays} days)</span>
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <CreditCard className="h-4 w-4 mr-1 text-gray-500" />
              <span>৳{booking.paidAmount} / ৳{booking.totalAmount}</span>
            </div>
          </div>
          
          {booking.checkInDateTime && (
            <div className="flex items-center text-xs text-gray-600 mt-2">
              <Clock className="h-3 w-3 mr-1" />
              <span>Checked in: {formatDateTime(booking.checkInDateTime)}</span>
            </div>
          )}
          
          {booking.checkOutDateTime && (
            <div className="flex items-center text-xs text-gray-600 mt-1">
              <Clock className="h-3 w-3 mr-1" />
              <span>Checked out: {formatDateTime(booking.checkOutDateTime)}</span>
            </div>
          )}
          
          <div className="mt-4 space-y-2">
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
                  <Plus className="h-4 w-4 mr-1" />
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

            {booking.cancelledAt && (
              <div className="bg-red-100 text-red-800 px-4 py-2 rounded-md text-sm">
                Booking cancelled on {format(parseISO(booking.cancelledAt), 'dd/MM/yyyy HH:mm')}
              </div>
            )}
            
            {cancellationRequest?.status === 'pending' && (
  <div className="flex item-center justify-center bg-amber-100 text-amber-800 px-4 py-2 rounded-md text-sm">
    Cancellation request pending
  </div>
)}
        </div>
      </> 
    )}
</div>


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

export default BookingCard;