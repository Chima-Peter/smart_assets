import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface ReportData {
  assets?: any
  requests?: any
  transfers?: any
  maintenance?: any
  consumables?: any
  depreciation?: any
}

export function exportToPDF(reportType: string, data: ReportData | any) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPosition = margin

  // Colors
  const primaryColor: [number, number, number] = [41, 41, 41] // #292929
  const secondaryColor: [number, number, number] = [107, 114, 128] // #6b7280
  const accentColor: [number, number, number] = [16, 185, 129] // #10b981

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, pageWidth, 50, "F")
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("Smart Assets Management System", margin, 25)
  
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin, 35)
  
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.setFontSize(10)
  doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, margin, 42)

  yPosition = 60

  // Summary Report
  if (reportType === "summary" && data) {
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Executive Summary", margin, yPosition)
    yPosition += 15

    const summaryData = [
      ["Assets", data.assets?.total || 0, `${data.assets?.available || 0} Available`, `${data.assets?.allocated || 0} Allocated`],
      ["Requests", data.requests?.total || 0, `${data.requests?.pending || 0} Pending`, ""],
      ["Transfers", data.transfers?.total || 0, `${data.transfers?.pending || 0} Pending`, ""],
    ]

    autoTable(doc, {
      startY: yPosition,
      head: [["Category", "Total", "Status", ""]],
      body: summaryData,
      theme: "striped",
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 11,
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: margin, right: margin },
    })
  }

  // Assets Report
  if (reportType === "assets" && Array.isArray(data?.assets)) {
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Assets Report", margin, yPosition)
    yPosition += 10

    const tableData = data.assets.map((asset: any) => [
      asset.assetCode || "—",
      asset.name || "—",
      asset.type || "—",
      asset.status || "—",
      asset.registeredByUser?.name || "—",
      asset.allocatedToUser?.name || "—",
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [["Asset Code", "Name", "Type", "Status", "Registered By", "Allocated To"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 3 },
    })
  }

  // Requests Report
  if (reportType === "requests" && Array.isArray(data?.requests)) {
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Requests Report", margin, yPosition)
    yPosition += 10

    const tableData = data.requests.map((request: any) => [
      request.asset?.name || "—",
      request.asset?.assetCode || "—",
      request.requestedByUser?.name || "—",
      request.requestedByUser?.email || "—",
      request.status || "—",
      request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : "—",
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [["Asset Name", "Asset Code", "Requested By", "Email", "Status", "Requested At"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 3 },
    })
  }

  // Transfers Report
  if (reportType === "transfers" && Array.isArray(data?.transfers)) {
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Transfers Report", margin, yPosition)
    yPosition += 10

    const tableData = data.transfers.map((transfer: any) => [
      transfer.asset?.name || "—",
      transfer.asset?.assetCode || "—",
      transfer.fromUser?.name || "Stock/Officer",
      transfer.toUser?.name || "—",
      transfer.status || "—",
      transfer.requestedAt ? new Date(transfer.requestedAt).toLocaleDateString() : "—",
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [["Asset Name", "Asset Code", "From", "To", "Status", "Requested At"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 3 },
    })
  }

  // Maintenance Report
  if (reportType === "maintenance" && (Array.isArray(data) || Array.isArray(data?.maintenance))) {
    const maintenanceData = Array.isArray(data) ? data : data?.maintenance || []
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Maintenance Report", margin, yPosition)
    yPosition += 10

    const tableData = maintenanceData.map((item: any) => [
      item.asset?.name || "—",
      item.asset?.assetCode || "—",
      item.type || "—",
      item.status || "—",
      item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : "—",
      item.completedDate ? new Date(item.completedDate).toLocaleDateString() : "—",
      item.cost ? `$${item.cost.toFixed(2)}` : "—",
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [["Asset Name", "Asset Code", "Type", "Status", "Scheduled Date", "Completed Date", "Cost"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 3 },
    })
  }

  // Consumables Report
  if (reportType === "consumables" && (Array.isArray(data) || Array.isArray(data?.consumables))) {
    const consumablesData = Array.isArray(data) ? data : data?.consumables || []
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Consumables Report", margin, yPosition)
    yPosition += 10

    const tableData = consumablesData.map((item: any) => [
      item.assetCode || "—",
      item.name || "—",
      item.quantity || 0,
      item.allocatedQuantity || 0,
      (item.quantity || 0) - (item.allocatedQuantity || 0),
      item.unit || "units",
      item.registeredByUser?.name || "—",
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [["Asset Code", "Name", "Total Qty", "Allocated", "Available", "Unit", "Registered By"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 3 },
    })
  }

  // Depreciation Report
  if (reportType === "depreciation" && (Array.isArray(data) || Array.isArray(data?.depreciation))) {
    const depreciationData = Array.isArray(data) ? data : data?.depreciation || []
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Asset Depreciation Report", margin, yPosition)
    yPosition += 10

    const tableData = depreciationData.map((item: any) => [
      item.assetCode || "—",
      item.name || "—",
      item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : "—",
      item.originalValue ? `$${item.originalValue.toFixed(2)}` : "—",
      item.currentValue ? `$${item.currentValue.toFixed(2)}` : "—",
      item.depreciationAmount ? `$${item.depreciationAmount.toFixed(2)}` : "—",
      `${item.depreciationPercentage || 0}%`,
      `${item.ageInYears || 0} years`,
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [["Asset Code", "Name", "Purchase Date", "Original Value", "Current Value", "Depreciation", "Depreciation %", "Age"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 3 },
    })
  }

  // Footer on each page
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8)
    doc.setTextColor(...secondaryColor)
    doc.text(
      `Page ${pageNum} of ${totalPages} | Smart Assets Management System`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    )
  }

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(i, totalPages)
  }

  // Save PDF
  const filename = `${reportType}-report-${new Date().toISOString().split("T")[0]}.pdf`
  doc.save(filename)
}

export function exportToCSV(reportType: string, data: ReportData | any) {
  let csvContent = ""
  let filename = ""
  const date = new Date().toISOString().split("T")[0]

  // Summary Report
  if (reportType === "summary" && data) {
    filename = `summary-report-${date}.csv`
    csvContent = "Category,Total,Available,Allocated,Pending\n"
    csvContent += `Assets,${data.assets?.total || 0},${data.assets?.available || 0},${data.assets?.allocated || 0},\n`
    csvContent += `Requests,${data.requests?.total || 0},,,${data.requests?.pending || 0}\n`
    csvContent += `Transfers,${data.transfers?.total || 0},,,${data.transfers?.pending || 0}\n`
  }

  // Assets Report
  else if (reportType === "assets" && Array.isArray(data?.assets)) {
    filename = `assets-report-${date}.csv`
    csvContent = "Asset Code,Name,Type,Status,Quantity,Allocated Quantity,Unit,Registered By,Allocated To,Location\n"
    data.assets.forEach((asset: any) => {
      csvContent += `"${asset.assetCode || ""}","${asset.name || ""}","${asset.type || ""}","${asset.status || ""}","${asset.quantity || ""}","${asset.allocatedQuantity || ""}","${asset.unit || ""}","${asset.registeredByUser?.name || ""}","${asset.allocatedToUser?.name || ""}","${asset.location || ""}"\n`
    })
  }

  // Requests Report
  else if (reportType === "requests" && Array.isArray(data?.requests)) {
    filename = `requests-report-${date}.csv`
    csvContent = "Asset Name,Asset Code,Requested By,Email,Requested Quantity,Status,Requested At,Approved At,Fulfilled At\n"
    data.requests.forEach((request: any) => {
      csvContent += `"${request.asset?.name || ""}","${request.asset?.assetCode || ""}","${request.requestedByUser?.name || ""}","${request.requestedByUser?.email || ""}","${request.requestedQuantity || 1}","${request.status || ""}","${request.requestedAt ? new Date(request.requestedAt).toLocaleString() : ""}","${request.approvedAt ? new Date(request.approvedAt).toLocaleString() : ""}","${request.fulfilledAt ? new Date(request.fulfilledAt).toLocaleString() : ""}"\n`
    })
  }

  // Transfers Report
  else if (reportType === "transfers" && Array.isArray(data?.transfers)) {
    filename = `transfers-report-${date}.csv`
    csvContent = "Asset Name,Asset Code,From,From Email,To,To Email,Transfer Quantity,Status,Requested At,Approved At,Completed At\n"
    data.transfers.forEach((transfer: any) => {
      csvContent += `"${transfer.asset?.name || ""}","${transfer.asset?.assetCode || ""}","${transfer.fromUser?.name || "Stock/Officer"}","${transfer.fromUser?.email || ""}","${transfer.toUser?.name || ""}","${transfer.toUser?.email || ""}","${transfer.transferQuantity || 1}","${transfer.status || ""}","${transfer.requestedAt ? new Date(transfer.requestedAt).toLocaleString() : ""}","${transfer.approvedAt ? new Date(transfer.approvedAt).toLocaleString() : ""}","${transfer.completedAt ? new Date(transfer.completedAt).toLocaleString() : ""}"\n`
    })
  }

  // Maintenance Report
  else if (reportType === "maintenance" && (Array.isArray(data) || Array.isArray(data?.maintenance))) {
    const maintenanceData = Array.isArray(data) ? data : data?.maintenance || []
    filename = `maintenance-report-${date}.csv`
    csvContent = "Asset Name,Asset Code,Type,Status,Scheduled Date,Completed Date,Cost,Vendor,Technician,Notes\n"
    maintenanceData.forEach((item: any) => {
      csvContent += `"${item.asset?.name || ""}","${item.asset?.assetCode || ""}","${item.type || ""}","${item.status || ""}","${item.scheduledDate ? new Date(item.scheduledDate).toLocaleString() : ""}","${item.completedDate ? new Date(item.completedDate).toLocaleString() : ""}","${item.cost || ""}","${item.vendor || ""}","${item.technician || ""}","${(item.notes || "").replace(/"/g, '""')}"\n`
    })
  }

  // Consumables Report
  else if (reportType === "consumables" && (Array.isArray(data) || Array.isArray(data?.consumables))) {
    const consumablesData = Array.isArray(data) ? data : data?.consumables || []
    filename = `consumables-report-${date}.csv`
    csvContent = "Asset Code,Name,Category,Total Quantity,Allocated Quantity,Available Quantity,Unit,Min Stock Level,Registered By,Location\n"
    consumablesData.forEach((item: any) => {
      csvContent += `"${item.assetCode || ""}","${item.name || ""}","${item.category || ""}","${item.quantity || 0}","${item.allocatedQuantity || 0}","${(item.quantity || 0) - (item.allocatedQuantity || 0)}","${item.unit || ""}","${item.minStockLevel || ""}","${item.registeredByUser?.name || ""}","${item.location || ""}"\n`
    })
  }

  // Depreciation Report
  else if (reportType === "depreciation" && (Array.isArray(data) || Array.isArray(data?.depreciation))) {
    const depreciationData = Array.isArray(data) ? data : data?.depreciation || []
    filename = `depreciation-report-${date}.csv`
    csvContent = "Asset Code,Name,Type,Status,Purchase Date,Original Value,Current Value,Depreciation Amount,Depreciation %,Age (Years)\n"
    depreciationData.forEach((item: any) => {
      csvContent += `"${item.assetCode || ""}","${item.name || ""}","${item.type || ""}","${item.status || ""}","${item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : ""}","${item.originalValue || ""}","${item.currentValue || ""}","${item.depreciationAmount || ""}","${item.depreciationPercentage || 0}%","${item.ageInYears || 0}"\n`
    })
  }

  else {
    alert("No data available to export")
    return
  }

  // Add BOM for Excel compatibility
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

