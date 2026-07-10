export interface ReservationPayload {
  guests: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customerName: string;
  customerPhone: string;
  specialRequest?: string;
}

export interface ReservationResponse {
  success: boolean;
  reservation?: {
    id: string;
    guests: number;
    date: string;
    time: string;
    customerName: string;
    customerPhone: string;
    specialRequest: string;
    createdAt: string;
    status: "pending" | "confirmed";
  };
  error?: string;
}

export interface FetchReservationsResponse {
  success: boolean;
  reservations?: Array<{
    id: string;
    guests: number;
    date: string;
    time: string;
    customerName: string;
    customerPhone: string;
    specialRequest: string;
    createdAt: string;
    status: "pending" | "confirmed";
  }>;
  error?: string;
}

/**
 * Service to interact with the backend reservation API.
 */
export const reservationService = {
  /**
   * Submits a new reservation to the backend.
   */
  async submitReservation(payload: ReservationPayload): Promise<ReservationResponse> {
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      return data;
    } catch (error: any) {
      console.error("Error in submitReservation:", error);
      return {
        success: false,
        error: error.message || "Failed to submit reservation. Please try again.",
      };
    }
  },

  /**
   * Fetches all active reservations from the backend.
   */
  async fetchReservations(): Promise<FetchReservationsResponse> {
    try {
      const response = await fetch("/api/reservations", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      return data;
    } catch (error: any) {
      console.error("Error in fetchReservations:", error);
      return {
        success: false,
        error: error.message || "Failed to load reservations.",
      };
    }
  }
};
