export interface LessonTypeItem {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  studentPrice?: number;
  quickBuy?: boolean;
  quickBuyDescription?: string;
}

export interface LessonCategory {
  id: string;
  name: string;
  type: 'lesson' | 'session';
  items: LessonTypeItem[];
}

export interface LessonTypesResponse {
  success: boolean;
  data?: {
    categories: LessonCategory[];
  };
  error?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  instructor: {
    id: string;
    name: string;
  };
  available: boolean;
  reason?: string;
}

export interface AvailableSlotsResponse {
  success: boolean;
  data?: {
    date: string;
    type: string;
    slots: TimeSlot[];
  };
  error?: string;
}

export interface SessionItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  spotsLeft: number;
  totalSpots: number;
  instructor?: {
    id: string;
    name: string;
  };
  location?: string;
}

export interface AvailableSessionsResponse {
  success: boolean;
  data?: {
    sessions: SessionItem[];
  };
  error?: string;
}

export interface BookingRequest {
  type: string;
  lessonTypeId: string;
  startTime: string;
  duration: number;
  instructorId?: string;
  transmission?: 'manual' | 'automatic';
  notes?: string;
}

export interface BookingResponse {
  success: boolean;
  data?: {
    booking: {
      id: string;
      type: string;
      startTime: string;
      endTime: string;
      status: string;
      instructor?: {
        id: string;
        name: string;
      };
      invoiceId?: string;
      paymentUrl?: string;
    };
    message: string;
  };
  error?: string;
}

export type BookingStep = 'select-type' | 'calendar' | 'sessions' | 'confirm';
