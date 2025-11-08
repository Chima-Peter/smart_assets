"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Html5Qrcode } from "html5-qrcode"

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onError?: (error: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onError, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopScanning = useCallback(async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch (err) {
        console.error("Error stopping scanner:", err)
      }
      setIsScanning(false)
    }
  }, [isScanning])

  useEffect(() => {
    const startScanning = async () => {
      try {
        const scanner = new Html5Qrcode("barcode-scanner")
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" }, // Use back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Successfully scanned
            onScan(decodedText)
            stopScanning()
          },
          () => {
            // Ignore scanning errors (they're frequent while scanning)
          }
        )

        setIsScanning(true)
        setError(null)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to start camera"
        setError(errorMsg)
        if (onError) {
          onError(errorMsg)
        }
      }
    }

    startScanning()

    return () => {
      stopScanning()
    }
  }, [onScan, onError, stopScanning])

  const handleClose = async () => {
    await stopScanning()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header - Always visible */}
        <div className="flex items-center justify-between p-5 border-b-2 border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Scan Barcode</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xl transition-colors flex items-center justify-center"
            aria-label="Close scanner"
          >
            ×
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-600 rounded-r-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-bold text-red-900 mb-1">Camera Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                  <p className="text-sm text-red-600 mt-2">Please grant camera permissions in your browser settings.</p>
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <div id="barcode-scanner" className="w-full rounded-xl overflow-hidden bg-gray-900 shadow-lg"></div>
            {!error && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="border-2 border-white/50 rounded-lg w-64 h-64 shadow-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                </div>
              </div>
            )}
          </div>

          {!error && (
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-gray-600 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Position the barcode within the frame
              </p>
            </div>
          )}
        </div>

        {/* Footer - Always visible */}
        <div className="p-5 border-t-2 border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="w-full px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 font-bold text-base transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel Scanning
          </button>
        </div>
      </div>
    </div>
  )
}

