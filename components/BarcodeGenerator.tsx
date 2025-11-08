"use client"

import { useEffect, useRef } from "react"
import JsBarcode from "jsbarcode"

interface BarcodeGeneratorProps {
  value: string
  format?: "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC"
  width?: number
  height?: number
  displayValue?: boolean
}

export default function BarcodeGenerator({
  value,
  format = "CODE128",
  width = 2,
  height = 100,
  displayValue = true,
}: BarcodeGeneratorProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize: 16,
          margin: 10,
        })
      } catch (error) {
        console.error("Error generating barcode:", error)
      }
    }
  }, [value, format, width, height, displayValue])

  if (!value) {
    return (
      <div className="p-4 border-2 border-gray-300 rounded-lg text-center text-gray-500">
        Barcode will appear here
      </div>
    )
  }

  return (
    <div className="p-4 border-2 border-gray-800 rounded-lg bg-white">
      <svg ref={barcodeRef} className="w-full"></svg>
    </div>
  )
}

