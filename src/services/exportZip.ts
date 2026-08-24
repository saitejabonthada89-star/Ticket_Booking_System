import JSZip from 'jszip';
import { SYSTEM_DESIGN_WRITEUP } from './systemDesignDoc';

export async function generateProjectZip(): Promise<void> {
  const zip = new JSZip();

  const README_CONTENT = `# OmniTicket - High-Demand Ticket Booking & Seat Management System

A high-concurrency ticket booking platform for movies and concerts featuring:
- 💺 **Interactive Visual Seat Map** with real-time status (available, held, booked).
- ⏱️ **Seat Hold Engine with TTL Auto-Release** (10-minute hold countdown with background sweeper).
- 🔒 **Concurrency Mutex Protection** (prevents double-booking collisions under simultaneous load).
- ⚡ **Priority Waitlist with Auto-Reallocation** on cancellations & time-limited 10-min claim windows.
- 🎟️ **Instant QR Code Generation** and email pass delivery.
- 📱 **Gate Scanner** for QR ticket authentication and check-in.
- 👥 **Role-Based Workflows**: Customer, Event Organiser, and System Admin.
- 🧪 **Chaos & Concurrency Simulator**: Test race conditions and waitlist cascades in real time.

---

## 🚀 Quick Start

### 1. Installation
\`\`\`bash
npm install
\`\`\`

### 2. Development Server
\`\`\`bash
npm run dev
\`\`\`
The application will launch on \`http://localhost:3000\`.

### 3. Production Build
\`\`\`bash
npm run build
\`\`\`

---

## ⚙️ Environment Variables (.env.example)
\`\`\`env
# Port Configuration
PORT=3000

# App URL for QR Code Verification and Links
APP_URL="http://localhost:3000"

# Optional Gemini API Key (if enabling AI seating recommendations)
GEMINI_API_KEY=""
\`\`\`

---

## 🗄️ Database Schema & Data Models
See \`SYSTEM_DESIGN.md\` for complete PostgreSQL / Firestore data schemas covering Venues, Events, Seats, Holds, Bookings, Waitlists, and Audit Logs.

---

## 📚 API Endpoints Overview
- \`GET /api/events\` - Retrieve all active movie and concert listings
- \`POST /api/events/:id/hold\` - Atomic seat hold with configurable TTL
- \`DELETE /api/holds/:id\` - Release hold on cart abandonment
- \`POST /api/events/:id/book\` - Confirm payment, update seats to 'booked', generate QR code
- \`POST /api/bookings/:id/cancel\` - Cancel booking and trigger waitlist auto-assignment
- \`POST /api/events/:id/waitlist\` - Join category-specific priority waitlist
- \`POST /api/gate/validate\` - Validate ticket QR code and mark checked-in
`;

  // Root configuration files
  zip.file('README.md', README_CONTENT);
  zip.file('SYSTEM_DESIGN.md', SYSTEM_DESIGN_WRITEUP);
  zip.file('.env.example', `PORT=3000\nAPP_URL="http://localhost:3000"\nGEMINI_API_KEY=""\n`);
  zip.file('index.html', `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OmniTicket | Real-Time Ticket Booking System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.tsx"></script>
  </body>
</html>`);

  zip.file('package.json', JSON.stringify({
    name: "omniticket-booking-system",
    version: "2.0.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      "qrcode": "^1.5.4",
      "canvas-confetti": "^1.9.4",
      "jszip": "^3.10.1",
      "lucide-react": "^0.546.0",
      "motion": "^12.23.24",
      "react": "^19.0.1",
      "react-dom": "^19.0.1"
    },
    devDependencies: {
      "@tailwindcss/vite": "^4.1.14",
      "@types/qrcode": "^1.5.5",
      "@types/canvas-confetti": "^1.9.0",
      "@types/node": "^22.14.0",
      "@types/react": "^19.0.1",
      "@types/react-dom": "^19.0.1",
      "@vitejs/plugin-react": "^5.0.4",
      "tailwindcss": "^4.1.14",
      "typescript": "~5.8.2",
      "vite": "^6.2.3"
    }
  }, null, 2));

  // Generate zip Blob and trigger browser download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'OmniTicket_SourceCode_Complete.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
