# Face Recognition Attendance System

A modern face recognition attendance system built with React, TypeScript, and Vite. Features automatic late entry fine generation and WhatsApp notifications using WhatsApp Web integration.

## Features

- **Face Recognition**: AI-powered face detection and recognition using face-api.js
- **Attendance Tracking**: Real-time attendance marking with period-based tracking
- **Late Entry Fines**: Automatic fine generation for students arriving after 9:35 AM
- **WhatsApp Integration**: Send fine notifications via WhatsApp Web (opens pre-filled messages)
- **QR Code Payments**: Generate UPI payment QR codes for fine payments
- **Records Management**: View and manage attendance records and fines

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Twilio WhatsApp Setup

#### Get Twilio Credentials:
1. Sign up at [Twilio](https://www.twilio.com/)
2. Get your Account SID and Auth Token from the Twilio Console
3. Enable WhatsApp Sandbox or purchase a WhatsApp number

#### Configure Environment Variables:
Create a `.env` file in the root directory:
```env
VITE_TWILIO_ACCOUNT_SID=your_account_sid_here
VITE_TWILIO_AUTH_TOKEN=your_auth_token_here
VITE_TWILIO_WHATSAPP_NUMBER=your_whatsapp_number_here
```

**Security Note**: For production use, implement server-side API calls to protect Twilio credentials.

### 3. Run the Application
```bash
npm run dev
```

## Usage

### Student Registration
1. Go to the Register page
2. Fill in student details including WhatsApp numbers
3. Capture face for recognition

### Taking Attendance
1. Go to the Attendance page
2. Students arriving on time (before 9:35 AM) get marked present automatically
3. Late students (after 9:35 AM) receive fines and WhatsApp notifications

### Managing Records
- View attendance records and unpaid fines
- Mark fines as paid to complete attendance
- Export attendance data to CSV

## WhatsApp Integration

The system automatically opens WhatsApp Web with pre-filled messages when fines are generated:

- **To Students**: Fine details + UPI payment string
- **To Parents**: Fine notification (no payment details)

Messages are sent by opening WhatsApp Web in new tabs with pre-filled content. This approach works in any browser without requiring API keys or server-side setup.

### How it works:
1. When a student arrives late, the system generates a fine
2. WhatsApp Web opens with a pre-filled message containing fine details
3. Users can send the message directly from WhatsApp Web
4. Multiple tabs may open if both student and parent WhatsApp numbers are provided

## Fine Calculation

- Base fine: ₹20
- Additional ₹10 for every 5 minutes late
- Example: 45 minutes late = ₹20 + ₹10 + ₹10 + ₹10 = ₹50

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Face Recognition**: face-api.js with TensorFlow.js
- **WhatsApp Integration**: WhatsApp Web API (browser-based)
- **QR Codes**: qrcode library
- **PDF Generation**: jsPDF
- **Build Tool**: Vite

## Security Considerations

⚠️ **Important**: The current implementation exposes Twilio credentials in client-side code. For production:

1. Move Twilio API calls to a backend server
2. Store credentials securely server-side
3. Use environment variables on the server
4. Implement proper authentication and rate limiting

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
