# 🔧 SmartSlot Frontend Application

Modern, responsive web application for automotive service scheduling, bay allocation, customer order tracking, and technician dispatch built with **React**, **Vite**, and **Tailwind CSS**.

---

## 🌟 Key Features

### 1. Multi-Step Booking Wizard
* **Multi-Service Selection**: Select 1 or more services simultaneously (e.g., *4-Wheel Laser Alignment* + *Brake Pad Replacement*). Features a real-time sticky package summary showing combined duration and total INR price.
* **Specialist Certification Matching**: Displays only technicians certified for *all* chosen services, or choose **"Any Available Specialist"** for intelligent auto-allocation.
* **Real-Time Date & Slot Grid**: Select from 14 calendar days with 30-minute workshop intervals. Includes visual status indicators (**Available**, **Held in Checkout**, **Booked**).
* **Temporary Checkout Hold**: Placing a slot on hold starts an interactive 5-minute countdown timer with automatic release upon timeout.
* **Inline Form Validation**: Immediate feedback on customer name, email format, phone digits, and vehicle details.

### 2. Enhanced Confirmation Experience
* **One-Click Reference Code Copy**: Instant clipboard copying with visual confirmation.
* **Add to Calendar (.ics)**: Download an iCalendar `.ics` file compatible with Google Calendar, Apple Calendar, and Outlook.
* **Print / PDF Summary**: One-click printable receipt for customers.
* **Cancellation & Rescheduling Policy**: Clear policy card highlighting complimentary cancellation up to 2 hours prior to arrival.

### 3. Track & Manage Bookings Portal
* **Live Search**: Query bookings by Reference Code (`SLOT-XXXX`) or customer phone number.
* **Reschedule Modal**: Choose a new date and time from live availability slots with conflict prevention.
* **Complimentary Cancellation**: Cancel scheduled appointments with instant release of the workshop bay back to the public pool.
* **Customer Isolation**: Logged-in customers automatically see their vehicle service history under **"My Bookings"**.

### 4. Technician / Staff Bay Portal
* **Dedicated Desktop & Mobile Login**: Access technician login directly from the navigation bar.
* **Assigned Bay Roster**: Technicians can only view and manage appointments assigned to their specific bay.
* **Live Job Lifecycle**: Update status seamlessly from `CONFIRMED` &rarr; `IN_PROGRESS` &rarr; `COMPLETED` or `NO_SHOW`.
* **Internal Technician Notes**: Add service notes and checklist comments directly to job records.

### 5. Facility Operations & Admin Dashboard
* **Realized Revenue Tracking**: Financial KPIs count revenue strictly from `COMPLETED` appointments.
* **Operational Metrics**: Accurate computation of no-show rate, completion rate, and cancellation rate.
* **Technician Utilization**: Real-time workload percentage and scheduled weekly capacity per technician.
* **Service Demand & Peak Hours**: Visual distribution of peak workshop hours and high-demand maintenance categories.
* **Technician Roster Management**: Add new technicians, assign service certifications, and modify working shifts.

---

## 🛠️ Technology Stack

| Layer | Tool | Purpose |
| :--- | :--- | :--- |
| **Framework** | React 19 / 18 | Declarative component UI |
| **Build Tool** | Vite 8 | Ultra-fast development server & production bundler |
| **Styling** | Tailwind CSS v4 | Utility-first responsive design & animations |
| **Icons** | Lucide React | Clean automotive and UI iconography |
| **Effects** | Canvas Confetti | Celebration effects on confirmed bookings |
| **Routing / State** | Context API (`AuthContext`) | Session management, JWT decoding & role access |

---

## 📁 Project Structure

```
frontend/
├── public/                    # Static assets & icons
├── src/
│   ├── api.js                 # Centralized API client with JWT header handling
│   ├── App.jsx                # App shell, tab routing & modal containers
│   ├── index.css              # Global styles & Tailwind imports
│   ├── main.jsx               # React entry point
│   ├── context/
│   │   └── AuthContext.jsx    # Session state, login, register & token persistence
│   ├── components/
│   │   ├── Navbar.jsx         # Responsive navigation, brand & technician portal links
│   │   ├── admin/
│   │   │   ├── AdminHeader.jsx    # Admin navigation tabs & quick stats
│   │   │   ├── AnalyticsView.jsx  # KPI metrics, revenue cards & demand charts
│   │   │   └── StaffManager.jsx   # Technician CRUD, schedules & capabilities
│   │   ├── customer/
│   │   │   ├── BookingWizard.jsx     # 4-step booking workflow & confirmation
│   │   │   ├── CustomerAuthModal.jsx # Customer, technician & admin auth modals
│   │   │   └── ManageBooking.jsx     # Order tracking, reschedule & cancel
│   │   └── staff/
│   │       └── StaffDashboard.jsx    # Assigned bay appointments & status updates
│   └── utils/
│       └── formatters.js      # Currency (INR ₹) and date formatting helpers
├── vercel.json                # Production API rewrites for Vercel deployment
└── vite.config.js             # Vite development server & proxy configuration
```

---

## 🚀 Local Setup & Development Instructions

### Prerequisites
* **Node.js**: v18.0.0 or higher (v20+ recommended)
* **npm**: v9.0.0 or higher
* **Backend Running**: The SmartSlot backend should ideally be running locally on `http://localhost:5000` (or the frontend can connect to your deployed cloud backend).

---

### Step-by-Step Frontend Setup

#### 1. Navigate to the Frontend Directory
```bash
cd frontend
```

#### 2. Install Dependencies
```bash
npm install
```
This installs `react`, `react-dom`, `lucide-react`, `tailwindcss`, `@tailwindcss/vite`, `canvas-confetti`, and other development tools.

#### 3. Development Proxy Configuration
In `vite.config.js`, requests starting with `/api` are automatically forwarded to your local backend server:
```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    }
  }
}
```
*(No manual environment variables needed for local development).*

#### 4. Start the Local Frontend Dev Server
```bash
npm run dev
```

Open your browser and navigate to:  
👉 **`http://localhost:3000`**

#### 5. Build for Production
To generate the optimized static bundle in the `dist/` directory:
```bash
npm run build
```

To preview the built production bundle locally:
```bash
npm run preview
```

---

## 🏃‍♂️ How to Run Full-Stack Locally (Both Frontend & Backend)

To test the entire SmartSlot platform on your local machine simultaneously:

1. **Terminal 1 (Backend)**:
   ```bash
   cd backend
   npm install
   npm run seed
   npm start
   ```
   *Runs API server on `http://localhost:5000`*

2. **Terminal 2 (Frontend)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Runs Vite client on `http://localhost:3000`*

3. Open **`http://localhost:3000`** in your browser. All booking, slot hold, payment summaries, technician logins, and calendar exports will operate seamlessly with instant hot reload!

---

## 👤 Testing User Roles Locally

* **Guest Customer**: Click **"Book Appointment"** to pick multiple services and test booking without creating an account.
* **Registered Customer**: Click **"Sign In"** (`rajesh@example.com` / `customer123`) to view personal service history in **"My Bookings"**.
* **Technician (Staff)**: Click the **"Technician Login"** button with the wrench icon in the top navigation bar (`david@smartslot.service` / `staff123` or `marcus@smartslot.service` / `staff123`) to open the assigned bay schedule.
* **Administrator**: Click **"Sign In"** → **"Login as Admin"** (`admin@smartslot.service` / `admin123`) to access full KPI metrics, realized revenue cards, and technician management.

---

## 🌐 Production Deployment

The frontend includes a pre-configured `vercel.json` rewrite:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://smartslot-backend-0l60.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```
All `/api/*` network requests are automatically routed to your live Render backend without requiring manual CORS configuration.
