# Rootstock GasLens Frontend

A React + TypeScript frontend for the Rootstock GasLens gas price oracle service.

## Features

- Real-time gas price data from Rootstock Mainnet and Testnet
- On-chain smart contract integration (when contract is deployed)
- Responsive design with Rootstock brand colors
- Auto-refresh every 15 seconds
- Web3 wallet integration via Wagmi

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

### Smart Contract Integration

To enable on-chain data fetching, update the `CONTRACT_ADDRESS` in `src/OnChainData.tsx`:

```typescript
const CONTRACT_ADDRESS = '0xYourContractAddressHere'
```

### Backend API

The frontend expects the backend API to be running on `http://localhost:8000`. If you need to change this, update the API URLs in `src/App.tsx`.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **Wagmi** for Web3 integration
- **Ethers.js v5** for blockchain interaction
- **TanStack Query** for data fetching

## Project Structure

```
src/
├── App.tsx           # Main application component
├── main.tsx          # Entry point with Wagmi configuration
├── index.css         # Global styles with TailwindCSS
├── GasCard.tsx       # Reusable gas price display component
└── OnChainData.tsx   # Smart contract integration component
```

