# Rootstock GasLens Frontend

A React + TypeScript frontend for the Rootstock GasLens gas price oracle service.

## Features

- Real-time gas price data from Rootstock Mainnet and Testnet
- Responsive design with Rootstock brand colors
- Auto-refresh every 15 seconds
- Clean, focused interface showing only essential gas price data

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure the backend API is running on port 8000:
   ```bash
   # In the backend directory
   cd ../backend
   node index.js
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

## Configuration

### Backend API

The frontend expects the backend API to be running on `http://localhost:8000`. If you need to change this, update the API URLs in `src/App.tsx`.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling

## Project Structure

```
src/
├── App.tsx           # Main application component
├── main.tsx          # Entry point
├── index.css         # Global styles with TailwindCSS
└── GasCard.tsx       # Reusable gas price display component
```

## API Endpoints

The frontend fetches data from these backend endpoints:
- `GET http://localhost:8000/api/gas/mainnet` - RSK Mainnet gas prices
- `GET http://localhost:8000/api/gas/testnet` - RSK Testnet gas prices

## Features

- **Real-time Updates**: Data refreshes automatically every 15 seconds
- **Loading States**: Shows loading spinners while fetching data
- **Error Handling**: Displays error messages if API calls fail
- **Responsive Design**: Works on desktop and mobile devices
- **Rootstock Branding**: Uses official Rootstock colors and styling

