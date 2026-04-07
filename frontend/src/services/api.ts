import axios, { AxiosRequestConfig } from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Track whether a refresh is in-flight to prevent concurrent refresh calls
let isRefreshing = false
// Queue of callbacks waiting for a new token
let refreshSubscribers: Array<(token: string | null) => void> = []

const onTokenRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

const subscribeToRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb)
}

// Response interceptor — auto-refresh JWT on 401 before giving up
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Prevent infinite retry loops
      originalRequest._retry = true

      if (isRefreshing) {
        // Another request already triggered a refresh — queue this one
        return new Promise((resolve, reject) => {
          subscribeToRefresh((newToken) => {
            if (!newToken) {
              reject(error)
              return
            }
            if (originalRequest.headers) {
              (originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
            }
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true

      try {
        // Use the refresh function exposed by AuthContext through window
        const refreshFn = (window as any).__refreshAccessToken as
          | (() => Promise<string | null>)
          | undefined

        const newToken = refreshFn ? await refreshFn() : null

        isRefreshing = false
        onTokenRefreshed(newToken)

        if (!newToken) {
          // Refresh failed — redirect to login
          window.location.href = '/login'
          return Promise.reject(error)
        }

        // Retry the original request with the new token
        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        onTokenRefreshed(null)
        // Clear auth and redirect
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  phone?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: {
    id: string
    email: string
    full_name: string
    phone?: string
  }
}

export interface ProfileResponse {
  id: string
  email: string
  fullName: string
  phone: string
  createdAt: string
}

export const authAPI = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data)
    return response.data
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return response.data
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile')
    return response.data
  },
}

export interface SeatInfo {
  seatClass: string
  availableCount: number
  totalCount: number
}

export interface FareInfo {
  seatClass: string
  basePrice: number
  currency: string
}

export interface FlightSchedule {
  id: string
  flightId: string
  flightNumber: string
  airlineName: string
  airlineCode: string
  originAirportId: string
  originAirportCode: string
  originAirportName: string
  originCity: string
  destinationAirportId: string
  destinationAirportCode: string
  destinationAirportName: string
  destinationCity: string
  departureTime: string
  arrivalTime: string
  departureDate: string
  durationMinutes: number
  status: string
  availableSeats: SeatInfo[]
  fares: FareInfo[]
}

export interface PaginatedResponse<T> {
  content: T[]
  totalPages: number
  totalElements: number
  number: number
  size: number
}

export interface Airport {
  id: string
  code: string
  name: string
  city: string
  country: string
}

export const flightAPI = {
  getSchedulesPage: async (params: {
    page?: number
    size?: number
    sortBy?: string
    direction?: 'ASC' | 'DESC'
  }): Promise<PaginatedResponse<FlightSchedule> | FlightSchedule[]> => {
    const response = await api.get<PaginatedResponse<FlightSchedule> | FlightSchedule[]>('/flights/schedules', {
      params,
    })
    return response.data
  },

  searchSchedulesByNames: async (params: {
    originName: string
    destinationName: string
    date: string
  }): Promise<FlightSchedule[]> => {
    const response = await api.get<FlightSchedule[]>('/flights/search', {
      params,
    })
    return response.data
  },

  getAirports: async (): Promise<PaginatedResponse<Airport>> => {
    const response = await api.get<PaginatedResponse<Airport>>('/flights/airports', {
      params: {
        page: 0,
        size: 1000,
        sortBy: 'name',
        direction: 'ASC',
      },
    })
    return response.data
  },

  getScheduleById: async (id: string): Promise<FlightSchedule> => {
    const response = await api.get<FlightSchedule>(`/flights/schedules/${id}`)
    return response.data
  },

  getScheduleSeats: async (id: string) => {
    const response = await api.get<SeatInfo[]>(`/flights/schedules/${id}/seats`)
    return response.data
  },
}

export interface Station {
  id: string
  code: string
  name: string
  city: string
}

export interface TrainSchedule {
  id: string
  trainId: string
  trainNumber: string
  operator: string
  departureStationId: string
  departureStationCode: string
  departureStationName: string
  departureCity: string
  arrivalStationId: string
  arrivalStationCode: string
  arrivalStationName: string
  arrivalCity: string
  departureTime: string
  arrivalTime: string
  departureDate: string
  status: string
  availableSeats: SeatInfo[]
}

export interface CoachSeatDTO {
  id: string
  coachId: string
  trainScheduleId: string
  coachNumber: string
  seatNumber: string
  seatClass: string
  status: string
}

export const trainAPI = {
  getSchedulesPage: async (params: {
    page?: number
    size?: number
    sortBy?: string
    direction?: 'ASC' | 'DESC'
  }): Promise<PaginatedResponse<TrainSchedule> | TrainSchedule[]> => {
    const response = await api.get<PaginatedResponse<TrainSchedule> | TrainSchedule[]>('/trains/schedules', {
      params,
    })
    return response.data
  },

  searchSchedulesByNames: async (params: {
    originName: string
    destinationName: string
    date: string
  }): Promise<TrainSchedule[]> => {
    const response = await api.get<TrainSchedule[]>('/trains/search', {
      params: {
        originName: params.originName,
        destinationName: params.destinationName,
        date: params.date,
      },
    })
    return Array.isArray(response.data) ? response.data : []
  },

  getStations: async (): Promise<Station[]> => {
    const response = await api.get<Station[] | { content: Station[] }>('/trains/stations')
    const data = response.data as Station[] | { content: Station[] }
    if (Array.isArray(data)) return data
    if (Array.isArray((data as { content: Station[] })?.content)) return (data as { content: Station[] }).content
    return []
  },

  getScheduleById: async (id: string): Promise<TrainSchedule> => {
    const response = await api.get<TrainSchedule>(`/trains/schedules/${id}`)
    return response.data
  },

  getScheduleSeats: async (id: string) => {
    const response = await api.get<CoachSeatDTO[]>(`/trains/schedules/${id}/seats`)
    return response.data
  },
}

export interface Hotel {
  id: string
  name: string
  address: string
  city: string
  rating?: number
  roomTypes?: RoomType[]
  createdAt: string
  updatedAt?: string
}

export interface RoomType {
  id: string
  hotelId: string
  name: string
  capacity: number
  amenities?: string
  rooms?: Room[]
  rates?: RoomRate[]
  createdAt: string
  updatedAt?: string
}

export interface Room {
  id: string
  roomTypeId: string
  roomNumber: string
  floor?: number
  status: string
  createdAt: string
  updatedAt?: string
}

export interface RoomRate {
  id: string
  roomTypeId: string
  date: string
  price: number
  currency: string
  createdAt: string
  updatedAt?: string
}

export interface AvailableRoomInfo {
  roomTypeId: string
  roomTypeName: string
  capacity: number
  availableCount: number
  totalCount: number
  minPrice: number
  currency: string
}

export interface HotelSearchParams {
  city?: string
  checkin?: string
  checkout?: string
  guests?: number
  page?: number
  size?: number
}

export const hotelAPI = {
  getHotels: async (params?: HotelSearchParams): Promise<PaginatedResponse<Hotel> | Hotel[]> => {
    const response = await api.get<PaginatedResponse<Hotel> | Hotel[]>('/hotels', {
      params,
    })
    return response.data
  },

  searchHotels: async (params: HotelSearchParams): Promise<PaginatedResponse<Hotel> | Hotel[]> => {
    const response = await api.get<PaginatedResponse<Hotel> | Hotel[]>('/hotels/search', {
      params,
    })
    return response.data
  },

  getHotelById: async (id: string): Promise<Hotel> => {
    const response = await api.get<Hotel>(`/hotels/${id}`)
    return response.data
  },

  getHotelRooms: async (id: string, params?: { checkin?: string; checkout?: string; guests?: number }): Promise<AvailableRoomInfo[]> => {
    const response = await api.get<AvailableRoomInfo[]>(`/hotels/${id}/rooms`, {
      params,
    })
    return response.data
  },

  getHotelRates: async (id: string): Promise<RoomRate[]> => {
    const response = await api.get<RoomRate[]>(`/hotels/${id}/rates`)
    return response.data
  },
}

// Booking interfaces
export interface BookingMetadata {
  seat_numbers?: string[]
  room_numbers?: string[]
  passenger_names?: string[]
  check_in_date?: string
  check_out_date?: string
}

export interface BookingItem {
  id: string
  booking_id: string
  item_type: 'flight' | 'train' | 'hotel'
  item_ref_id: string
  price: number
  quantity: number
  metadata?: BookingMetadata
  created_at: string
  updated_at?: string
}

export interface Booking {
  id: string
  user_id: string
  booking_reference: string
  booking_type: 'flight' | 'train' | 'hotel'
  total_amount: number
  currency: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'initiated'
  items: BookingItem[]
  created_at: string
  updated_at?: string
}

export interface CreateBookingItemRequest {
  item_type: 'flight' | 'train' | 'hotel'
  item_ref_id: string
  price: number
  quantity: number
  metadata?: BookingMetadata
}

export interface CreateBookingRequest {
  booking_type: 'flight' | 'train' | 'hotel'
  items: CreateBookingItemRequest[]
}

export const bookingAPI = {
  createBooking: async (request: CreateBookingRequest): Promise<Booking> => {
    const response = await api.post<Booking>('/bookings', request)
    return response.data
  },

  getBookingById: async (id: string): Promise<Booking> => {
    const response = await api.get<Booking>(`/bookings/${id}`)
    return response.data
  },

  getBookingByReference: async (reference: string): Promise<Booking> => {
    const response = await api.get<Booking>(`/bookings/reference/${reference}`)
    return response.data
  },

  getUserBookings: async (userId: string, params?: { limit?: number; offset?: number }): Promise<Booking[]> => {
    const response = await api.get<Booking[]>(`/bookings/user/${userId}`, {
      params,
    })
    return response.data
  },

  cancelBooking: async (id: string): Promise<{ message: string; booking_id: string }> => {
    const response = await api.post<{ message: string; booking_id: string }>(`/bookings/${id}/cancel`)
    return response.data
  },
}

// Payment types
export type PaymentStatus = 'initiated' | 'succeeded' | 'failed' | 'refunded'
export type PaymentMethod = 'bank_transfer' | 'ewallet' | 'credit_card'

export interface Payment {
  id: string
  booking_id: string
  user_id: string
  amount: number
  currency: string
  status: PaymentStatus
  payment_method: PaymentMethod
  created_at: string
}

export interface CreatePaymentRequest {
  booking_id: string
  amount: number
  currency?: string
  payment_method: PaymentMethod
}

export const paymentAPI = {
  createPayment: async (request: CreatePaymentRequest): Promise<Payment> => {
    const response = await api.post<Payment>('/payments', request)
    return response.data
  },

  getPayment: async (id: string): Promise<Payment> => {
    const response = await api.get<Payment>(`/payments/${id}`)
    return response.data
  },

  refundPayment: async (id: string): Promise<Payment> => {
    const response = await api.post<Payment>(`/payments/${id}/refund`)
    return response.data
  },
}

export const profileAPI = {
  getProfile: async () => {
    const response = await api.get<ProfileResponse>('/profile')
    return response.data
  },

  updateProfile: async (data: { fullName?: string; phone?: string }) => {
    const response = await api.put<ProfileResponse>('/profile', data)
    return response.data
  },

  updatePassword: async (data: any) => {
    const response = await api.put('/profile/password', data)
    return response.data
  },
}

export interface PricingResponse {
  basePrice: number
  tax: number
  discount: number
  totalPrice: number
  currency: string
}

export const pricingAPI = {
  calculatePrice: async (basePrice: number, couponCode?: string, currency?: string): Promise<PricingResponse> => {
    const response = await api.get<PricingResponse>('/pricing/calculate', {
      params: { basePrice, couponCode: couponCode || undefined, currency },
    })
    return response.data
  },
}

export interface AdminMetricsResponse {
  totalUsers: number
  totalBookings: number
  totalRevenue: number
  totalFlights: number
  totalTrains: number
  totalHotels: number
}

export const adminAPI = {
  getMetrics: async (): Promise<AdminMetricsResponse> => {
    const response = await api.get<AdminMetricsResponse>('/admin/metrics')
    return response.data
  },

  addFlight: async (data: any) => {
    const response = await api.post('/admin/flights', data)
    return response.data
  },

  addTrain: async (data: any) => {
    const response = await api.post('/admin/trains', data)
    return response.data
  },

  addHotel: async (data: any) => {
    const response = await api.post('/admin/hotels', data)
    return response.data
  },
}

export default api
