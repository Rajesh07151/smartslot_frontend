// API client for SmartSlot with Auth Header support
const BASE_URL = '/api';

function getHeaders(customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  const token = localStorage.getItem('smartslot_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth endpoints
  async register(payload) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json.data;
  },

  async login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    return json.data;
  },

  async adminLogin(email, password) {
    const res = await fetch(`${BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Admin authentication failed');
    return json.data;
  },

  async staffLogin(email, password) {
    const res = await fetch(`${BASE_URL}/auth/staff-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Staff authentication failed');
    return json.data;
  },

  async getMe() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Session check failed');
    return json.data;
  },

  // Services
  async getServices() {
    const res = await fetch(`${BASE_URL}/services`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch services');
    return json.data;
  },

  async updateService(id, payload) {
    const res = await fetch(`${BASE_URL}/services/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update service');
    return json.data;
  },

  // Staff
  async getStaff() {
    const res = await fetch(`${BASE_URL}/staff`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch staff');
    return json.data;
  },

  async createStaff(payload) {
    const res = await fetch(`${BASE_URL}/staff`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to add technician');
    return json.data;
  },

  async updateStaff(id, payload) {
    const res = await fetch(`${BASE_URL}/staff/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update technician');
    return json;
  },

  async deleteStaff(id) {
    const res = await fetch(`${BASE_URL}/staff/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete technician');
    return json;
  },

  async updateStaffSchedule(staffId, schedules) {
    const res = await fetch(`${BASE_URL}/staff/${staffId}/schedule`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ schedules })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update schedule');
    return json.data;
  },

  async updateStaffServices(staffId, serviceIds) {
    const res = await fetch(`${BASE_URL}/staff/${staffId}/services`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ serviceIds })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update capabilities');
    return json.data;
  },

  // Availability
  async getAvailability(serviceId, date, staffId = 'any', excludeAppointmentId = null, sessionId = null) {
    const params = new URLSearchParams({ serviceId, date });
    if (staffId) params.append('staffId', staffId);
    if (excludeAppointmentId) params.append('excludeAppointmentId', excludeAppointmentId);
    if (sessionId) params.append('sessionId', sessionId);

    const res = await fetch(`${BASE_URL}/availability?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch availability');
    return json.data;
  },

  // Slot checkout temporary hold
  async holdSlot(payload) {
    const res = await fetch(`${BASE_URL}/appointments/hold`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to hold slot');
    return json.data;
  },

  // Health Check
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  },

  // Appointments
  async createAppointment(payload, idempotencyKey = null) {
    const customHeaders = {};
    if (idempotencyKey) {
      customHeaders['Idempotency-Key'] = idempotencyKey;
    }
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: getHeaders(customHeaders),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to book appointment');
    return json.data;
  },

  async lookupAppointment(query) {
    const res = await fetch(`${BASE_URL}/appointments/lookup/${encodeURIComponent(query)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Appointment not found');
    return json.data;
  },

  async getMyBookings(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.userId) searchParams.append('userId', params.userId);
    if (params.email) searchParams.append('email', params.email);
    if (params.phone) searchParams.append('phone', params.phone);

    const qs = searchParams.toString();
    const url = `${BASE_URL}/appointments/my-bookings${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, {
      headers: getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch your bookings');
    return json.data;
  },

  async getAppointments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.staffId && filters.staffId !== 'all') params.append('staffId', filters.staffId);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const res = await fetch(`${BASE_URL}/appointments?${params.toString()}`, {
      headers: getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch appointments');
    return json.data;
  },

  async updateAppointmentStatus(id, status, staffNotes = null) {
    const res = await fetch(`${BASE_URL}/appointments/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, staffNotes })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update status');
    return json.data;
  },

  async rescheduleAppointment(id, payload) {
    const res = await fetch(`${BASE_URL}/appointments/${id}/reschedule`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to reschedule appointment');
    return json.data;
  },

  async cancelAppointment(id, reason, verification = {}) {
    const res = await fetch(`${BASE_URL}/appointments/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        reason,
        bookingReference: verification.bookingReference,
        phone: verification.phone,
        email: verification.email
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to cancel appointment');
    return json;
  },

  async sendReminder(id, reminderType = 'REMINDER_24H') {
    const res = await fetch(`${BASE_URL}/appointments/${id}/send-reminder`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reminderType })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to send reminder');
    return json;
  },

  // Analytics
  async getAnalytics() {
    const res = await fetch(`${BASE_URL}/analytics`, {
      headers: getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch analytics');
    return json.data;
  },

  // Notifications audit
  async getNotifications(limit = 50) {
    const res = await fetch(`${BASE_URL}/notifications?limit=${limit}`, {
      headers: getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch notifications');
    return json.data;
  }
};
