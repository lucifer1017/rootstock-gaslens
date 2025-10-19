/**
 * Rootstock GasLens - Core API Engine
 * Gas price oracle service for Rootstock (RSK) Mainnet and Testnet
 */

const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');

const PORT = process.env.PORT || 8000;
const BLOCKS_TO_ANALYZE = 20;

const NETWORKS = {
    mainnet: 'https://public-node.rsk.co',
    testnet: 'https://public-node.testnet.rsk.co'
};

/**
 * Creates an ethers provider for the specified network
 */
function createProvider(network) {
    const rpcUrl = NETWORKS[network];
    if (!rpcUrl) {
        throw new Error(`Unsupported network: ${network}`);
    }
    return new ethers.providers.JsonRpcProvider(rpcUrl);
}

/**
 * Advanced gas price calculation with congestion-aware percentile adjustment
 */
async function calculateGasPrices(provider) {
    try {
        // Get the latest block number
        const latestBlockNumber = await provider.getBlockNumber();

        const blockPromises = [];
        for (let i = 0; i < BLOCKS_TO_ANALYZE; i++) {
            const blockNumber = latestBlockNumber - i;
            blockPromises.push(provider.getBlockWithTransactions(blockNumber));
        }

        const blocks = await Promise.all(blockPromises);
        const gasPrices = [];
        const transactionTypes = { simple: [], contract: [] };

        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
            const block = blocks[blockIndex];
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.gasPrice && tx.gasPrice.gt(0)) {
                        const price = parseInt(tx.gasPrice.toString());
                        gasPrices.push({
                            price: price,
                            blockAge: blockIndex,
                            isContractCall: tx.data !== '0x' && tx.data.length > 2,
                            timestamp: block.timestamp
                        });

                        if (tx.data === '0x' || tx.data.length <= 2) {
                            transactionTypes.simple.push(price);
                        } else {
                            transactionTypes.contract.push(price);
                        }
                    }
                }
            }
        }

        if (gasPrices.length > 0) {
            const simpleTransferPrices = transactionTypes.simple.sort((a, b) => a - b);
            const contractCallPrices = transactionTypes.contract.sort((a, b) => a - b);

            console.log(`Found ${gasPrices.length} total transactions`);
            console.log(`Simple transfers: ${simpleTransferPrices.length}, Contract calls: ${contractCallPrices.length}`);

            const primaryPrices = contractCallPrices.length > 0 ? contractCallPrices : gasPrices.map(tx => tx.price).sort((a, b) => a - b);

            const priceRange = primaryPrices[primaryPrices.length - 1] - primaryPrices[0];
            const congestionLevel = priceRange / primaryPrices[0];

            let safeLowPercentile, standardPercentile, fastPercentile;

            if (congestionLevel > 0.5) {
                safeLowPercentile = 0.1;
                standardPercentile = 0.4;
                fastPercentile = 0.7;
                console.log('High congestion detected, using aggressive percentiles');
            } else if (congestionLevel > 0.2) {
                safeLowPercentile = 0.15;
                standardPercentile = 0.45;
                fastPercentile = 0.75;
                console.log('Medium congestion detected, using balanced percentiles');
            } else {
                safeLowPercentile = 0.2;
                standardPercentile = 0.5;
                fastPercentile = 0.8;
                console.log('Low congestion detected, using standard percentiles');
            }

            const length = primaryPrices.length;
            const safeLowIndex = Math.max(0, Math.floor(length * safeLowPercentile) - 1);
            const standardIndex = Math.floor(length * standardPercentile);
            const fastIndex = Math.min(length - 1, Math.floor(length * fastPercentile));

            const safeLow = primaryPrices[safeLowIndex];
            const standard = primaryPrices[standardIndex];
            const fast = primaryPrices[fastIndex];

            console.log(`Congestion level: ${(congestionLevel * 100).toFixed(1)}%`);
            console.log(`Price range: ${primaryPrices[0]} to ${primaryPrices[length - 1]}`);
            console.log(`Calculated: SafeLow=${safeLow}, Standard=${standard}, Fast=${fast}`);

            return {
                safeLow: safeLow.toString(),
                standard: standard.toString(),
                fast: fast.toString()
            };
        } else {
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
 */
async function calculateFallbackGasPrices(provider) {
    try {
        const baseGasPrice = await provider.getGasPrice();
        const basePrice = parseInt(baseGasPrice.toString());

        console.log(`Fallback calculation - Base gas price: ${basePrice}`);

        const safeLow = Math.floor(basePrice * 0.7).toString();
        const standard = basePrice.toString();
        const fast = Math.floor(basePrice * 1.5).toString();

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

const app = express();

app.use(cors());
app.use(express.json());

/**
 * GET /api/gas/:network - Returns gas price estimations for Rootstock networks
 */
app.get('/api/gas/:network', async (req, res) => {
    try {
        const { network } = req.params;

        if (!NETWORKS[network]) {
            return res.status(400).json({
                error: 'Invalid network parameter',
                message: 'Network must be either "mainnet" or "testnet"',
                received: network
            });
        }

        const provider = createProvider(network);
        const gasPrices = await calculateGasPrices(provider);

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

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Rootstock GasLens API'
    });
});

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

app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'The requested endpoint does not exist',
        path: req.originalUrl
    });
});

app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Rootstock GasLens API server running on port ${PORT}`);
    console.log(`📊 Available networks: ${Object.keys(NETWORKS).join(', ')}`);
    console.log(`🔗 API endpoint: http://localhost:${PORT}/api/gas/:network`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
