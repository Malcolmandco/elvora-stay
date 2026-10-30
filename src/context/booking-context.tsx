import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { BookingDraft, AvailableRoom, SelectedRoom, CatalogRoom } from '@/types/booking';

interface BookingContextValue {
  draft: BookingDraft | null;
  setDraft: (draft: BookingDraft | null) => void;
  selectedRoom: SelectedRoom | null;
  selectRoom: (room: AvailableRoom, draft: BookingDraft) => void;
  selectCatalogRoom: (room: CatalogRoom, draft: BookingDraft) => void;
  clearDraft: () => void;
  pendingRedirect: string | null;
  setPendingRedirect: (path: string | null) => void;
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

const DRAFT_KEY = 'elvora_booking_draft';
const REDIRECT_KEY = 'elvora_booking_redirect';

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<BookingDraft | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<SelectedRoom | null>(null);
  const [pendingRedirect, setPendingRedirectState] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(DRAFT_KEY);
      if (savedDraft) setDraftState(JSON.parse(savedDraft));
      const savedRedirect = sessionStorage.getItem(REDIRECT_KEY);
      if (savedRedirect) setPendingRedirectState(savedRedirect);
    } catch {
      // ignore parse errors
    }
  }, []);

  const setDraft = (newDraft: BookingDraft | null) => {
    setDraftState(newDraft);
    if (newDraft) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(newDraft));
    } else {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  };

  const selectRoom = (room: AvailableRoom, baseDraft: BookingDraft) => {
    const roomSelection: SelectedRoom = {
      roomId: room.roomId,
      roomName: room.roomName,
      rateId: room.rateId,
      supplierOfferId: room.supplierOfferId,
      supplier: room.supplier,
      supplierPropertyId: room.supplierPropertyId,
      mealPlan: room.mealPlan,
      cancellationPolicy: room.cancellationPolicy,
      currency: room.currency,
      subtotal: room.subtotal,
      taxes: room.taxes,
      total: room.total,
      priceTimestamp: room.priceTimestamp,
    };
    setSelectedRoom(roomSelection);
    const updatedDraft: BookingDraft = {
      ...baseDraft,
      selectedRoom: roomSelection,
    };
    setDraft(updatedDraft);
  };

  const selectCatalogRoom = (room: CatalogRoom, baseDraft: BookingDraft) => {
    const nights = baseDraft.checkIn && baseDraft.checkOut
      ? Math.max(1, Math.round((new Date(baseDraft.checkOut).getTime() - new Date(baseDraft.checkIn).getTime()) / 86400000))
      : 1;
    const total = room.pricePerNight * nights * baseDraft.rooms;
    const roomSelection: SelectedRoom = {
      roomId: room.id,
      roomName: room.roomName,
      rateId: room.supplierRoomCode,
      supplierOfferId: room.supplierRoomCode,
      supplier: 'hotelbeds',
      supplierPropertyId: room.propertyId,
      mealPlan: 'Room only',
      cancellationPolicy: 'Cancellation policy available at checkout',
      currency: room.currency,
      subtotal: total,
      taxes: 0,
      total,
      priceTimestamp: room.priceSyncedAt || new Date().toISOString(),
      roomSnapshot: {
        roomId: room.id,
        supplierRoomCode: room.supplierRoomCode,
        roomName: room.roomName,
        pricePerNight: room.pricePerNight,
        currency: room.currency,
      },
    };
    setSelectedRoom(roomSelection);
    const updatedDraft: BookingDraft = {
      ...baseDraft,
      selectedRoom: roomSelection,
    };
    setDraft(updatedDraft);
  };

  const clearDraft = () => {
    setDraft(null);
    setSelectedRoom(null);
    setPendingRedirect(null);
  };

  const setPendingRedirect = (path: string | null) => {
    setPendingRedirectState(path);
    if (path) {
      sessionStorage.setItem(REDIRECT_KEY, path);
    } else {
      sessionStorage.removeItem(REDIRECT_KEY);
    }
  };

  return (
    <BookingContext.Provider
      value={{
        draft,
        setDraft,
        selectedRoom,
        selectRoom,
        selectCatalogRoom,
        clearDraft,
        pendingRedirect,
        setPendingRedirect,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
