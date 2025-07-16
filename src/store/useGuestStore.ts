import { create } from 'zustand';
import { Guest } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface GuestState {
  guests: Guest[];
  addGuest: (guest: Omit<Guest, 'id'>) => string;
  updateGuest: (id: string, guestData: Partial<Guest>) => boolean;
  deleteGuest: (id: string) => boolean;
  getGuestById: (id: string) => Guest | undefined;
  getAllGuests: () => Guest[];
  findOrCreateGuest: (guestData: Omit<Guest, 'id'>) => string;
}

// Demo initial data
const initialGuests: Guest[] = [
  {
    id: '1',
    name: 'Ahmed Khan',
    nationalId: 'BX782435',
    phone: '01712345678',
    dateOfBirth: '1985-03-15',
  },
  {
    id: '2',
    name: 'Fatima Rahman',
    nationalId: 'AZ567890',
    phone: '01898765432',
    dateOfBirth: '1990-07-22',
  },
  {
    id: '3',
    name: 'Kamal Hossain',
    nationalId: 'CY123456',
    phone: '01612345678',
    dateOfBirth: '1978-11-08',
  },
];

export const useGuestStore = create<GuestState>((set, get) => ({
  guests: initialGuests,

  addGuest: (guestData) => {
    const id = uuidv4();
    const newGuest = { ...guestData, id };
    set((state) => ({ guests: [...state.guests, newGuest] }));
    return id;
  },

  updateGuest: (id, guestData) => {
    let updated = false;
    set((state) => {
      const updatedGuests = state.guests.map((guest) => {
        if (guest.id === id) {
          updated = true;
          return { ...guest, ...guestData };
        }
        return guest;
      });
      return { guests: updatedGuests };
    });
    return updated;
  },

  deleteGuest: (id) => {
    let deleted = false;
    set((state) => {
      const filteredGuests = state.guests.filter((guest) => {
        if (guest.id === id) {
          deleted = true;
          return false;
        }
        return true;
      });
      return { guests: filteredGuests };
    });
    return deleted;
  },

  getGuestById: (id) => {
    return get().guests.find((guest) => guest.id === id);
  },

  getAllGuests: () => {
    return get().guests;
  },

  findOrCreateGuest: (guestData) => {
    // Try to find an existing guest with the same national ID
    const existingGuest = get().guests.find(
      (g) => g.nationalId === guestData.nationalId
    );
    
    if (existingGuest) {
      // If phone number or date of birth has changed, update them
      const updates: Partial<Guest> = {};
      if (existingGuest.phone !== guestData.phone) {
        updates.phone = guestData.phone;
      }
      if (existingGuest.dateOfBirth !== guestData.dateOfBirth) {
        updates.dateOfBirth = guestData.dateOfBirth;
      }
      if (Object.keys(updates).length > 0) {
        get().updateGuest(existingGuest.id, updates);
      }
      return existingGuest.id;
    }
    
    // If no existing guest found, create a new one
    return get().addGuest(guestData);
  },
}));