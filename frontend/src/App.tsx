import React, { useState, useEffect } from 'react'
import GasCard from './GasCard'

interface GasData {
  timestamp: string
  safeLow: string
  standard: string
  fast: string
}

const App: React.FC = () => {
  const [mainnetData, setMainnetData] = useState<GasData | null>(null)
  const [testnetData, setTestnetData] = useState<GasData | null>(null)
  const [mainnetLoading, setMainnetLoading] = useState(false)
  const [testnetLoading, setTestnetLoading] = useState(false)
  const [mainnetError, setMainnetError] = useState<string | null>(null)
  const [testnetError, setTestnetError] = useState<string | null>(null)

  const fetchGasData = async (network: 'mainnet' | 'testnet') => {
    const setLoading = network === 'mainnet' ? setMainnetLoading : setTestnetLoading
    const setData = network === 'mainnet' ? setMainnetData : setTestnetData
    const setError = network === 'mainnet' ? setMainnetError : setTestnetError

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`http://localhost:8000/api/gas/${network}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setData(data)
    } catch (err) {
      console.error(`Error fetching ${network} data:`, err)
      setError(err instanceof Error ? err.message : `Failed to fetch ${network} data`)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllData = () => {
    fetchGasData('mainnet')
    fetchGasData('testnet')
  }

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-rsk-dark-2">
      <div className="bg-rsk-dark-1 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl md:text-5xl font-bold text-center">
            <span className="text-rsk-green">Rootstock</span> GasLens
          </h1>
          <p className="text-gray-400 text-center mt-4 text-lg">
            Real-time gas price estimations for the Rootstock Network
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GasCard
              networkName="RSK Mainnet"
              data={mainnetData}
              isLoading={mainnetLoading}
              error={mainnetError}
            />
            <GasCard
              networkName="RSK Testnet"
              data={testnetData}
              isLoading={testnetLoading}
              error={testnetError}
            />
          </div>
        </div>

        <div className="mt-16 text-center text-gray-400">
          <p className="text-sm">
            Data refreshes automatically every 15 seconds
          </p>
          <p className="text-xs mt-2">
            Powered by Rootstock GasLens API
          </p>
        </div>
      </div>
    </div>
  )
}

export default App

