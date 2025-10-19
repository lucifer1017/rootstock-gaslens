import React from 'react'

interface GasData {
  timestamp: string
  safeLow: string
  standard: string
  fast: string
}

interface GasCardProps {
  networkName: string
  data: GasData | null
  isLoading: boolean
  error: string | null
}

const GasCard: React.FC<GasCardProps> = ({ networkName, data, isLoading, error }) => {
  const formatGasPrice = (price: string): string => {
    return (parseFloat(price) / 1e9).toFixed(2) + ' Gwei'
  }

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString()
  }

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rsk-green"></div>
    </div>
  )

  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="text-red-400 text-center py-4">
      <p className="font-medium">Error loading data</p>
      <p className="text-sm mt-1">{message}</p>
    </div>
  )

  return (
    <div className="bg-rsk-dark-1 rounded-lg p-6 shadow-lg border border-gray-700">
      <h3 className="text-rsk-green text-xl font-bold mb-4">{networkName}</h3>
      
      {isLoading && <LoadingSpinner />}
      
      {error && <ErrorMessage message={error} />}
      
      {data && !isLoading && !error && (
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <span className="text-gray-300">Safe Low</span>
            <span className="text-white font-mono text-lg">
              {formatGasPrice(data.safeLow)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <span className="text-gray-300">Standard</span>
            <span className="text-white font-mono text-lg font-semibold">
              {formatGasPrice(data.standard)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <span className="text-gray-300">Fast</span>
            <span className="text-rsk-green font-mono text-lg font-semibold">
              {formatGasPrice(data.fast)}
            </span>
          </div>
          
          <div className="pt-2 text-xs text-gray-400">
            Last updated: {formatTimestamp(data.timestamp)}
          </div>
        </div>
      )}
    </div>
  )
}

export default GasCard

