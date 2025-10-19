/**
 * Rootstock GasLens - Core API Engine
 * 
 * A gas price oracle service for Rootstock (RSK) Mainnet and Testnet.
 * Provides real-time gas price estimations using percentile-based calculations
 * from recent blockchain data.
 */

const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 8000;
const BLOCKS_TO_ANALYZE = 20;

// Rootstock network RPC endpoints
const NETWORKS = {
    mainnet: 'https://public-node.rsk.co',
    testnet: 'https://public-node.testnet.rsk.co'
};

// ============================================================================
// PROVIDER SETUP
// ============================================================================

/**
 * Creates an ethers provider for the specified network
 * @param {string} network - The network name (mainnet or testnet)
 * @returns {ethers.providers.JsonRpcProvider} Configured provider instance
 */
function createProvider(network) {
    const rpcUrl = NETWORKS[network];
    if (!rpcUrl) {
        throw new Error(`Unsupported network: ${network}`);
    }
    return new ethers.providers.JsonRpcProvider(rpcUrl);
}

// ============================================================================
// GAS PRICE CALCULATION LOGIC
// ============================================================================

/**
 * Calculates gas prices using percentile-based analysis of recent transactions
 * 
 * This function implements a robust gas price estimation strategy by:
 * 1. Fetching the most recent 20 blocks from the blockchain
 * 2. Extracting gas prices from all transactions in these blocks
 * 3. Filtering out invalid (zero/null) gas prices
 * 4. Calculating percentiles to determine safeLow (20th), standard (50th), and fast (80th) prices
 * 5. Providing fallback calculation if no valid transactions are found
 * 
 * @param {ethers.providers.JsonRpcProvider} provider - The ethers provider instance
 * @returns {Promise<Object>} Object containing safeLow, standard, and fast gas prices as strings
 */
async function calculateGasPrices(provider) {
    try {
        // Get the latest block number
        const latestBlockNumber = await provider.getBlockNumber();

        // Fetch the most recent blocks
        const blockPromises = [];
        for (let i = 0; i < BLOCKS_TO_ANALYZE; i++) {
            const blockNumber = latestBlockNumber - i;
            blockPromises.push(provider.getBlockWithTransactions(blockNumber));
        }

        const blocks = await Promise.all(blockPromises);

        // Extract gas prices from all transactions
        const gasPrices = [];

        for (const block of blocks) {
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    // Only include transactions with valid gas prices
                    if (tx.gasPrice && tx.gasPrice.gt(0)) {
                        gasPrices.push(tx.gasPrice.toString());
                    }
                }
            }
        }

        // If we have valid gas prices, calculate percentiles
        if (gasPrices.length > 0) {
            // Convert to numbers and sort ascending
            const sortedGasPrices = gasPrices
                .map(price => parseInt(price))
                .sort((a, b) => a - b);

            const length = sortedGasPrices.length;

            console.log(`Found ${length} transactions with gas prices`);
            console.log(`Gas price range: ${sortedGasPrices[0]} to ${sortedGasPrices[length - 1]}`);

            // Calculate percentiles with better logic
            const safeLowIndex = Math.max(0, Math.floor(length * 0.2) - 1);
            const standardIndex = Math.floor(length * 0.5);
            const fastIndex = Math.min(length - 1, Math.floor(length * 0.8));

            const safeLow = sortedGasPrices[safeLowIndex];
            const standard = sortedGasPrices[standardIndex];
            const fast = sortedGasPrices[fastIndex];

            // Ensure we have meaningful differences
            const minPrice = sortedGasPrices[0];
            const maxPrice = sortedGasPrices[length - 1];

            // If all prices are very similar, create artificial spread
            if (maxPrice - minPrice < minPrice * 0.1) { // Less than 10% difference
                console.log('Gas prices too similar, creating artificial spread');
                const basePrice = standard;
                return {
                    safeLow: Math.floor(basePrice * 0.8).toString(),
                    standard: basePrice.toString(),
                    fast: Math.floor(basePrice * 1.2).toString()
                };
            }

            console.log(`Calculated: SafeLow=${safeLow}, Standard=${standard}, Fast=${fast}`);

            return {
                safeLow: safeLow.toString(),
                standard: standard.toString(),
                fast: fast.toString()
            };
        } else {
            // Fallback: Use provider.getGasPrice() and derive values
            console.log('No valid transactions found, using fallback calculation');
            return await calculateFallbackGasPrices(provider);
        }

    } catch (error) {
        console.error('Error calculating gas prices:', error);
        throw new Error(`Failed to calculate gas prices: ${error.message}`);
    }
}

/**
 * Fallback gas price calculation when no recent transactions are available
 * Uses the base gas price from the provider and applies multipliers
 * 
 * @param {ethers.providers.JsonRpcProvider} provider - The ethers provider instance
 * @returns {Promise<Object>} Object containing calculated gas prices
 */
async function calculateFallbackGasPrices(provider) {
    try {
        const baseGasPrice = await provider.getGasPrice();
        const basePrice = parseInt(baseGasPrice.toString());

        console.log(`Fallback calculation - Base gas price: ${basePrice}`);

        // Apply multipliers to the base gas price with more meaningful differences
        const safeLow = Math.floor(basePrice * 0.7).toString();   // 70% of base
        const standard = basePrice.toString();                    // 100% of base
        const fast = Math.floor(basePrice * 1.5).toString();      // 150% of base

        console.log(`Fallback calculated: SafeLow=${safeLow}, Standard=${standard}, Fast=${fast}`);

        return {
            safeLow,
            standard,
            fast
        };
    } catch (error) {
        console.error('Error in fallback calculation:', error);
        throw new Error(`Fallback calculation failed: ${error.message}`);
    }
}

// ============================================================================
// EXPRESS APPLICATION SETUP
// ============================================================================

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json());

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /api/gas/:network
 * 
 * Returns gas price estimations for the specified Rootstock network
 * 
 * @param {string} network - Network name (mainnet or testnet)
 * @returns {Object} JSON response with gas prices and timestamp
 */
app.get('/api/gas/:network', async (req, res) => {
    try {
        const { network } = req.params;

        // Validate network parameter
        if (!NETWORKS[network]) {
            return res.status(400).json({
                error: 'Invalid network parameter',
                message: 'Network must be either "mainnet" or "testnet"',
                received: network
            });
        }

        // Create provider for the specified network
        const provider = createProvider(network);

        // Calculate gas prices
        const gasPrices = await calculateGasPrices(provider);

        // Prepare response
        const response = {
            timestamp: new Date().toISOString(),
            ...gasPrices
        };

        res.json(response);

    } catch (error) {
        console.error(`Error processing request for network ${req.params.network}:`, error);

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch gas price data',
            details: error.message
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Rootstock GasLens API'
    });
});

/**
 * Root endpoint with API information
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Rootstock GasLens API',
        version: '1.0.0',
        description: 'Gas price oracle for Rootstock (RSK) Mainnet and Testnet',
        endpoints: {
            'GET /api/gas/:network': 'Get gas price estimations (mainnet or testnet)',
            'GET /health': 'Health check endpoint'
        },
        networks: Object.keys(NETWORKS)
    });
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'The requested endpoint does not exist',
        path: req.originalUrl
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
    console.log(`🚀 Rootstock GasLens API server running on port ${PORT}`);
    console.log(`📊 Available networks: ${Object.keys(NETWORKS).join(', ')}`);
    console.log(`🔗 API endpoint: http://localhost:${PORT}/api/gas/:network`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
