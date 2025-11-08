import { PrismaClient } from '../lib/prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'
import { AssetType, AssetStatus, RequestStatus, TransferStatus, AssetCategory, UserRole } from '../lib/prisma/enums'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting comprehensive database seeding...')

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🗑️  Clearing existing data...')
  await prisma.activityLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.approval.deleteMany()
  await prisma.maintenance.deleteMany()
  await prisma.transfer.deleteMany()
  await prisma.request.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.systemConfig.deleteMany()
  await prisma.user.deleteMany()

  // ==================== USERS ====================
  console.log('👥 Creating users...')
  const adminPassword = await bcrypt.hash('admin123', 10)
  const officerPassword = await bcrypt.hash('officer123', 10)
  const lecturerPassword = await bcrypt.hash('lecturer123', 10)
  const repPassword = await bcrypt.hash('rep123', 10)

  const departments = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Engineering', 'Business', 'Arts']

  // Create Faculty Admins (2)
  const admins = []
  for (let i = 1; i <= 2; i++) {
    const admin = await prisma.user.create({
      data: {
        email: i === 1 ? 'admin@university.edu' : `admin${i}@university.edu`,
        password: adminPassword,
        name: i === 1 ? 'Faculty Admin' : `Admin User ${i}`,
        role: UserRole.FACULTY_ADMIN,
        department: 'Administration',
        employeeId: `ADM${String(i).padStart(3, '0')}`,
      },
    })
    admins.push(admin)
  }

  // Create Departmental Officers (5)
  const officers = []
  for (let i = 1; i <= 5; i++) {
    const dept = departments[i % departments.length]
    const officer = await prisma.user.create({
      data: {
        email: i === 1 ? 'officer@university.edu' : `officer${i}@university.edu`,
        password: officerPassword,
        name: i === 1 ? 'Departmental Officer' : `Officer ${dept} ${i}`,
        role: UserRole.DEPARTMENTAL_OFFICER,
        department: dept,
        employeeId: `OFF${String(i).padStart(3, '0')}`,
      },
    })
    officers.push(officer)
  }

  // Create Lecturers (8)
  const lecturers = []
  for (let i = 1; i <= 8; i++) {
    const dept = departments[i % departments.length]
    const lecturer = await prisma.user.create({
      data: {
        email: i === 1 ? 'lecturer@university.edu' : `lecturer${i}@university.edu`,
        password: lecturerPassword,
        name: i === 1 ? 'Dr. John Lecturer' : `Dr. Lecturer ${i} - ${dept}`,
        role: UserRole.LECTURER,
        department: dept,
        employeeId: `LEC${String(i).padStart(3, '0')}`,
      },
    })
    lecturers.push(lecturer)
  }

  // Create Course Reps (5)
  const reps = []
  for (let i = 1; i <= 5; i++) {
    const dept = departments[i % departments.length]
    const rep = await prisma.user.create({
      data: {
        email: i === 1 ? 'rep@university.edu' : `rep${i}@university.edu`,
        password: repPassword,
        name: i === 1 ? 'Course Representative' : `Course Rep ${i} - ${dept}`,
        role: UserRole.COURSE_REP,
        department: dept,
        employeeId: `REP${String(i).padStart(3, '0')}`,
      },
    })
    reps.push(rep)
  }

  console.log(`✅ Created ${admins.length + officers.length + lecturers.length + reps.length} users`)

  // ==================== ASSETS ====================
  console.log('📦 Creating assets...')
  const manufacturers = ['Dell', 'HP', 'Lenovo', 'Apple', 'Samsung', 'Canon', 'Epson', 'Microsoft', 'Logitech', 'Sony', 'Acer', 'Asus']
  const locations = ['Lab A', 'Lab B', 'Library', 'Lecture Hall 1', 'Lecture Hall 2', 'Office Block A', 'Office Block B', 'Storage Room', 'Lab C', 'Conference Room']
  const rooms = ['Room 101', 'Room 102', 'Room 201', 'Room 202', 'Room 301', 'Lab A-205', 'Lab B-310', 'Office 401', 'Office 402', 'Storage S1']

  const assetCategories = {
    [AssetType.EQUIPMENT]: ['Laptop', 'Desktop', 'Projector', 'Printer', 'Scanner', 'Tablet', 'Monitor', 'Server', 'Router', 'Switch'],
    [AssetType.CONSUMABLE]: ['Paper', 'Ink Cartridge', 'Toner', 'USB Drive', 'Cables', 'Batteries', 'Markers', 'Notebooks', 'Pens', 'Staples'],
    [AssetType.TEACHING_AID]: ['Whiteboard', 'Marker Board', 'Models', 'Charts', 'Posters', 'Maps', 'Globes', 'Calculators', 'Projector Screen', 'Display Board'],
    [AssetType.FURNITURE]: ['Desk', 'Chair', 'Cabinet', 'Bookshelf', 'Table', 'Filing Cabinet', 'Whiteboard Stand', 'Conference Table', 'Office Chair', 'Storage Unit'],
    [AssetType.OTHER]: ['Tool Kit', 'Extension Cord', 'Adapter', 'Stand', 'Mount', 'Case', 'Bag', 'Lock', 'Key', 'Label Maker'],
  }

  const assets = []
  let assetCounter = 1

  // Create 20 assets with variety
  for (let i = 0; i < 20; i++) {
    const type = Object.values(AssetType)[i % Object.values(AssetType).length] as AssetType
    const prefix = type.substring(0, 3).toUpperCase()
    const assetCode = `${prefix}-${String(assetCounter).padStart(6, '0')}`
    const category = assetCategories[type][i % assetCategories[type].length]
    const manufacturer = manufacturers[i % manufacturers.length]
    const location = locations[i % locations.length]
    const room = rooms[i % rooms.length]
    const purchaseDate = new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    const purchasePrice = Math.floor(Math.random() * 5000) + 100

    // Determine status
    const statusRand = Math.random()
    let status: AssetStatus
    let allocatedTo: string | null = null
    if (statusRand < 0.4) {
      status = AssetStatus.AVAILABLE
    } else if (statusRand < 0.7) {
      status = AssetStatus.ALLOCATED
      allocatedTo = lecturers[Math.floor(Math.random() * lecturers.length)].id
    } else if (statusRand < 0.9) {
      status = AssetStatus.MAINTENANCE
    } else {
      status = AssetStatus.RETIRED
    }

    // Determine asset category (for categorization)
    let assetCategory: AssetCategory | null = null
    if (type === AssetType.EQUIPMENT) {
      assetCategory = Math.random() > 0.3 ? AssetCategory.RETURNABLE : null
    } else if (type === AssetType.CONSUMABLE) {
      assetCategory = AssetCategory.CONSUMABLE
    } else if (type === AssetType.TEACHING_AID) {
      assetCategory = Math.random() > 0.5 ? AssetCategory.RETURNABLE : null
    }

    // Consumable-specific fields
    let quantity: number | null = null
    let minStockLevel: number | null = null
    let unit: string | null = null
    let expiryDate: Date | null = null

    if (type === AssetType.CONSUMABLE) {
      quantity = Math.floor(Math.random() * 500) + 10
      minStockLevel = Math.floor(quantity * 0.2)
      unit = ['boxes', 'units', 'packs', 'pieces', 'liters'][Math.floor(Math.random() * 5)]
      if (Math.random() > 0.5) {
        expiryDate = new Date(2025 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        assetCategory = AssetCategory.EXPIRABLE
      }
    }

    const asset = await prisma.asset.create({
      data: {
        name: `${category} ${manufacturer} ${assetCounter}`,
        description: `${type} asset for ${category.toLowerCase()} purposes. Serial: SN${String(assetCounter).padStart(8, '0')}`,
        assetCode,
        type,
        category,
        assetCategory,
        location,
        room,
        purchaseDate,
        purchasePrice,
        serialNumber: `SN${String(assetCounter).padStart(8, '0')}`,
        manufacturer,
        model: `${manufacturer} Model-${assetCounter}`,
        expiryDate,
        quantity,
        minStockLevel,
        unit,
        registeredBy: officers[Math.floor(Math.random() * officers.length)].id,
        status,
        allocatedTo,
        isArchived: status === AssetStatus.RETIRED && Math.random() > 0.7,
        archivedAt: status === AssetStatus.RETIRED && Math.random() > 0.7 ? new Date() : null,
      },
    })
    assets.push(asset)
    assetCounter++
  }

  console.log(`✅ Created ${assets.length} assets`)

  // ==================== REQUESTS ====================
  console.log('📋 Creating requests...')
  const purposes = [
    'For research project',
    'Teaching purposes',
    'Student lab work',
    'Department presentation',
    'Course demonstration',
    'Workshop preparation',
    'Conference presentation',
    'Data analysis project',
  ]

  const requests = []
  const availableAssets = assets.filter(a => a.status === AssetStatus.AVAILABLE)
  const allocatedAssets = assets.filter(a => a.status === AssetStatus.ALLOCATED)

  for (let i = 0; i < 20; i++) {
    // Mix of available and allocated assets
    const assetPool = i < 10 ? availableAssets : allocatedAssets
    if (assetPool.length === 0) continue

    const asset = assetPool[Math.floor(Math.random() * assetPool.length)]
    const lecturer = lecturers[Math.floor(Math.random() * lecturers.length)]
    const purpose = purposes[i % purposes.length]

    // Determine status distribution
    const statusRand = Math.random()
    let status: RequestStatus
    let approvedAt: Date | null = null
    let fulfilledAt: Date | null = null
    let returnedAt: Date | null = null
    let issuedBy: string | null = null
    let issuedAt: Date | null = null
    let issuanceCondition: string | null = null

    if (statusRand < 0.3) {
      status = RequestStatus.PENDING
    } else if (statusRand < 0.5) {
      status = RequestStatus.APPROVED
      approvedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    } else if (statusRand < 0.7) {
      status = RequestStatus.FULFILLED
      approvedAt = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000)
      fulfilledAt = new Date(approvedAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000)
      issuedBy = officers[Math.floor(Math.random() * officers.length)].id
      issuedAt = fulfilledAt
      issuanceCondition = ['FUNCTIONAL', 'GOOD', 'FAIR'][Math.floor(Math.random() * 3)]
    } else if (statusRand < 0.85) {
      status = RequestStatus.RETURNED
      approvedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      fulfilledAt = new Date(approvedAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000)
      returnedAt = new Date(fulfilledAt.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000)
      issuedBy = officers[Math.floor(Math.random() * officers.length)].id
      issuedAt = fulfilledAt
      issuanceCondition = 'FUNCTIONAL'
    } else {
      status = RequestStatus.REJECTED
      approvedAt = new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
    }

    const requestedAt = status === RequestStatus.PENDING
      ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
      : (approvedAt ? new Date(approvedAt.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) : new Date())

    const request = await prisma.request.create({
      data: {
        assetId: asset.id,
        requestedBy: lecturer.id,
        purpose,
        status,
        requestedAt,
        approvedAt,
        fulfilledAt,
        returnedAt,
        issuedBy,
        issuedAt,
        issuanceCondition,
        issuanceNotes: status === RequestStatus.FULFILLED || status === RequestStatus.RETURNED ? 'Asset issued in good condition' : null,
        returnCondition: status === RequestStatus.RETURNED ? ['FUNCTIONAL', 'GOOD', 'DAMAGED'][Math.floor(Math.random() * 3)] : null,
        returnNotes: status === RequestStatus.RETURNED ? 'Asset returned successfully' : null,
        notes: `Request notes for ${asset.name}`,
      },
    })
    requests.push(request)

    // Create approval record
    if (status !== RequestStatus.PENDING) {
      await prisma.approval.create({
        data: {
          requestId: request.id,
          approvedBy: officers[Math.floor(Math.random() * officers.length)].id,
          status: status === RequestStatus.REJECTED ? 'REJECTED' : 'APPROVED',
          comments: status === RequestStatus.REJECTED ? 'Not available at this time' : 'Approved for use',
          approvedAt: approvedAt || new Date(),
        },
      })
    }

    // Update asset status if fulfilled
    if (status === RequestStatus.FULFILLED || status === RequestStatus.RETURNED) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { status: AssetStatus.ALLOCATED, allocatedTo: lecturer.id }
      })
    }
  }

  console.log(`✅ Created ${requests.length} requests`)

  // ==================== TRANSFERS ====================
  console.log('🔄 Creating transfers...')
  const transferReasons = [
    'Department reassignment',
    'Project transfer',
    'Temporary loan',
    'Resource sharing',
    'Collaboration need',
    'Departmental reorganization',
    'Research collaboration',
    'Cross-department project',
  ]

  const transfers = []
  const transferableAssets = assets.filter(a => a.status === AssetStatus.ALLOCATED)

  for (let i = 0; i < 20; i++) {
    if (transferableAssets.length === 0) break

    const asset = transferableAssets[Math.floor(Math.random() * transferableAssets.length)]
    const fromLecturer = lecturers[Math.floor(Math.random() * lecturers.length)]
    const toLecturer = lecturers.find(l => l.id !== fromLecturer.id) || lecturers[0]
    const initiatingOfficer = officers[Math.floor(Math.random() * officers.length)]
    const reason = transferReasons[i % transferReasons.length]

    // Determine transfer type
    const fromDept = fromLecturer.department
    const toDept = toLecturer.department
    const transferType = fromDept === toDept ? 'INTRA_DEPARTMENTAL' : 'INTER_DEPARTMENTAL'

    // Determine status
    const statusRand = Math.random()
    let status: TransferStatus
    let approvedAt: Date | null = null
    let completedAt: Date | null = null
    let receiptNumber: string | null = null
    let receiptGeneratedAt: Date | null = null

    if (statusRand < 0.3) {
      status = TransferStatus.PENDING
    } else if (statusRand < 0.5) {
      status = TransferStatus.APPROVED
      approvedAt = new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
    } else if (statusRand < 0.8) {
      status = TransferStatus.COMPLETED
      approvedAt = new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000)
      completedAt = new Date(approvedAt.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000)
      receiptNumber = `TRF-${Date.now()}-${asset.id.substring(0, 6).toUpperCase()}`
      receiptGeneratedAt = completedAt
    } else {
      status = TransferStatus.REJECTED
      approvedAt = new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
    }

    const requestedAt = approvedAt
      ? new Date(approvedAt.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)

    const transfer = await prisma.transfer.create({
      data: {
        assetId: asset.id,
        fromUserId: fromLecturer.id,
        toUserId: toLecturer.id,
        initiatedBy: initiatingOfficer.id,
        transferType,
        reason,
        status,
        requestedAt,
        approvedAt,
        completedAt,
        receiptNumber,
        receiptGeneratedAt,
        notes: `Transfer notes for ${asset.name}`,
      },
    })
    transfers.push(transfer)

    // Create approval record
    if (status !== TransferStatus.PENDING) {
      await prisma.approval.create({
        data: {
          transferId: transfer.id,
          approvedBy: admins[0].id, // Faculty Admin approves transfers
          status: status === TransferStatus.REJECTED ? 'REJECTED' : 'APPROVED',
          comments: status === TransferStatus.REJECTED ? 'Transfer not approved' : 'Transfer approved',
          approvedAt: approvedAt || new Date(),
        },
      })
    }

    // Update asset if completed
    if (status === TransferStatus.COMPLETED) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { allocatedTo: toLecturer.id, location: toLecturer.department || undefined }
      })
    }
  }

  console.log(`✅ Created ${transfers.length} transfers`)

  // ==================== MAINTENANCE ====================
  console.log('🔧 Creating maintenance records...')
  const maintenanceTypes = ['PREVENTIVE', 'REPAIR', 'CALIBRATION', 'INSPECTION']
  const vendors = ['Tech Services Inc.', 'Maintenance Pro', 'Equipment Care Co.', 'Service Solutions', 'Pro Maintenance']
  const technicians = ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams', 'David Brown']

  const maintenanceRecords = []
  for (let i = 0; i < 20; i++) {
    const asset = assets[Math.floor(Math.random() * assets.length)]
    const type = maintenanceTypes[i % maintenanceTypes.length]
    const vendor = vendors[i % vendors.length]
    const technician = technicians[i % technicians.length]

    // Determine status
    const statusRand = Math.random()
    let status: string
    let scheduledDate: Date | null = null
    let completedDate: Date | null = null
    let cost: number | null = null

    if (statusRand < 0.3) {
      status = 'SCHEDULED'
      scheduledDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000)
    } else if (statusRand < 0.5) {
      status = 'IN_PROGRESS'
      scheduledDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    } else if (statusRand < 0.9) {
      status = 'COMPLETED'
      scheduledDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000)
      completedDate = new Date(scheduledDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000)
      cost = Math.floor(Math.random() * 2000) + 100
    } else {
      status = 'CANCELLED'
      scheduledDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    }

    const nextMaintenanceDate = status === 'COMPLETED' && type === 'PREVENTIVE'
      ? new Date(completedDate!.getTime() + 90 * 24 * 60 * 60 * 1000)
      : null

    const maintenance = await prisma.maintenance.create({
      data: {
        assetId: asset.id,
        type,
        scheduledDate,
        completedDate,
        serviceType: `${type} service for ${asset.name}`,
        cost,
        vendor,
        technician,
        notes: `Maintenance notes for ${asset.name}`,
        status,
        nextMaintenanceDate,
        reminderSent: status === 'SCHEDULED' && scheduledDate && scheduledDate > new Date() ? false : true,
        performedBy: status === 'COMPLETED' ? officers[Math.floor(Math.random() * officers.length)].id : null,
      },
    })
    maintenanceRecords.push(maintenance)

    // Update asset status if repair
    if (type === 'REPAIR' && (status === 'SCHEDULED' || status === 'IN_PROGRESS')) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { status: AssetStatus.MAINTENANCE }
      })
    }
  }

  console.log(`✅ Created ${maintenanceRecords.length} maintenance records`)

  // ==================== NOTIFICATIONS ====================
  console.log('🔔 Creating notifications...')
  const notificationTypes = [
    'REQUEST_APPROVED',
    'REQUEST_REJECTED',
    'ASSET_RETURNED',
    'TRANSFER_APPROVED',
    'TRANSFER_REJECTED',
    'MAINTENANCE_DUE',
    'EXPIRY_ALERT',
    'STOCK_LOW',
  ]

  const notifications = []
  for (let i = 0; i < 20; i++) {
    const user = [...lecturers, ...officers, ...admins][Math.floor(Math.random() * (lecturers.length + officers.length + admins.length))]
    const type = notificationTypes[i % notificationTypes.length]
    
    let title = ''
    let message = ''
    let relatedRequestId: string | null = null
    let relatedAssetId: string | null = null
    let relatedMaintenanceId: string | null = null

    switch (type) {
      case 'REQUEST_APPROVED':
        const approvedRequest = requests.find(r => r.status === RequestStatus.APPROVED || r.status === RequestStatus.FULFILLED)
        if (approvedRequest) {
          title = 'Asset Request Approved'
          message = `Your request for "${assets.find(a => a.id === approvedRequest.assetId)?.name}" has been approved.`
          relatedRequestId = approvedRequest.id
        }
        break
      case 'REQUEST_REJECTED':
        const rejectedRequest = requests.find(r => r.status === RequestStatus.REJECTED)
        if (rejectedRequest) {
          title = 'Asset Request Rejected'
          message = `Your request for "${assets.find(a => a.id === rejectedRequest.assetId)?.name}" has been rejected.`
          relatedRequestId = rejectedRequest.id
        }
        break
      case 'ASSET_RETURNED':
        const returnedRequest = requests.find(r => r.status === RequestStatus.RETURNED)
        if (returnedRequest) {
          title = 'Asset Returned'
          message = `Asset "${assets.find(a => a.id === returnedRequest.assetId)?.name}" has been returned.`
          relatedRequestId = returnedRequest.id
        }
        break
      case 'TRANSFER_APPROVED':
        const approvedTransfer = transfers.find(t => t.status === TransferStatus.APPROVED || t.status === TransferStatus.COMPLETED)
        if (approvedTransfer) {
          title = 'Asset Transfer Approved'
          message = `Transfer of "${assets.find(a => a.id === approvedTransfer.assetId)?.name}" has been approved.`
          relatedAssetId = approvedTransfer.assetId
        }
        break
      case 'MAINTENANCE_DUE':
        const upcomingMaintenance = maintenanceRecords.find(m => m.status === 'SCHEDULED' && m.scheduledDate && m.scheduledDate > new Date())
        if (upcomingMaintenance) {
          title = 'Upcoming Maintenance'
          message = `${assets.find(a => a.id === upcomingMaintenance.assetId)?.name} has scheduled maintenance on ${upcomingMaintenance.scheduledDate?.toLocaleDateString()}.`
          relatedMaintenanceId = upcomingMaintenance.id
          relatedAssetId = upcomingMaintenance.assetId
        }
        break
      case 'EXPIRY_ALERT':
        const expiringAsset = assets.find(a => a.expiryDate && a.expiryDate > new Date() && a.expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
        if (expiringAsset) {
          title = 'Asset Expiring Soon'
          message = `${expiringAsset.name} expires on ${expiringAsset.expiryDate?.toLocaleDateString()}.`
          relatedAssetId = expiringAsset.id
        }
        break
      case 'STOCK_LOW':
        const lowStockAsset = assets.find(a => a.type === AssetType.CONSUMABLE && a.quantity && a.minStockLevel && a.quantity <= a.minStockLevel)
        if (lowStockAsset) {
          title = 'Low Stock Alert'
          message = `${lowStockAsset.name} stock is low (${lowStockAsset.quantity} ${lowStockAsset.unit || 'units'} remaining).`
          relatedAssetId = lowStockAsset.id
        }
        break
    }

    if (!title) continue // Skip if no valid notification data

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type,
        title,
        message,
        relatedRequestId,
        relatedAssetId,
        relatedMaintenanceId,
        read: Math.random() > 0.5,
        emailSent: Math.random() > 0.7,
        smsSent: false,
      },
    })
    notifications.push(notification)
  }

  console.log(`✅ Created ${notifications.length} notifications`)

  // ==================== ACTIVITY LOGS ====================
  console.log('📝 Creating activity logs...')
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'TRANSFER', 'LOGIN', 'LOGOUT']
  const entityTypes = ['ASSET', 'REQUEST', 'TRANSFER', 'USER', 'MAINTENANCE', 'NOTIFICATION']

  const activityLogs = []
  for (let i = 0; i < 20; i++) {
    const user = [...admins, ...officers, ...lecturers][Math.floor(Math.random() * (admins.length + officers.length + lecturers.length))]
    const action = actions[i % actions.length]
    const entityType = entityTypes[i % entityTypes.length]

    let description = ''
    let entityId: string | null = null

    switch (entityType) {
      case 'ASSET':
        const asset = assets[Math.floor(Math.random() * assets.length)]
        description = `${action} asset: ${asset.name} (${asset.assetCode})`
        entityId = asset.id
        break
      case 'REQUEST':
        const request = requests[Math.floor(Math.random() * requests.length)]
        description = `${action} request for asset: ${assets.find(a => a.id === request.assetId)?.name}`
        entityId = request.id
        break
      case 'TRANSFER':
        const transfer = transfers[Math.floor(Math.random() * transfers.length)]
        description = `${action} transfer for asset: ${assets.find(a => a.id === transfer.assetId)?.name}`
        entityId = transfer.id
        break
      case 'MAINTENANCE':
        const maintenance = maintenanceRecords[Math.floor(Math.random() * maintenanceRecords.length)]
        description = `${action} maintenance record for ${assets.find(a => a.id === maintenance.assetId)?.name}`
        entityId = maintenance.id
        break
      default:
        description = `${action} ${entityType.toLowerCase()}`
    }

    const activityLog = await prisma.activityLog.create({
      data: {
        userId: user.id,
        action,
        entityType,
        entityId,
        description,
        metadata: JSON.stringify({ timestamp: new Date().toISOString(), userRole: user.role }),
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    activityLogs.push(activityLog)
  }

  console.log(`✅ Created ${activityLogs.length} activity logs`)

  // ==================== SYSTEM CONFIG ====================
  console.log('⚙️  Creating system configurations...')
  const configCategories = ['NOTIFICATION', 'MAINTENANCE', 'INVENTORY', 'GENERAL', 'SECURITY']
  const configKeys = [
    'notification.email.enabled',
    'notification.sms.enabled',
    'maintenance.reminder.days',
    'inventory.low_stock.threshold',
    'asset.barcode.format',
    'system.timezone',
    'system.language',
    'security.session.timeout',
    'report.export.format',
    'asset.auto_archive.days',
    'transfer.approval.required',
    'request.auto_approve.threshold',
    'maintenance.schedule.auto',
    'notification.batch.size',
    'audit.log.retention.days',
    'backup.frequency',
    'backup.location',
    'system.maintenance.mode',
    'feature.barcode.scanning',
    'feature.file.upload.max_size',
  ]

  const systemConfigs = []
  for (let i = 0; i < 20; i++) {
    const key = configKeys[i]
    const category = configCategories[i % configCategories.length]
    let value = ''
    let description = ''
    let configType: 'BOOLEAN' | 'STRING' | 'NUMBER' | undefined = undefined

    switch (key) {
      case 'notification.email.enabled':
        value = 'true'
        description = 'Enable email notifications'
        configType = 'BOOLEAN'
        break
      case 'notification.sms.enabled':
        value = 'false'
        description = 'Enable SMS notifications'
        configType = 'BOOLEAN'
        break
      case 'maintenance.reminder.days':
        value = '7'
        description = 'Days before maintenance to send reminder'
        configType = 'NUMBER'
        break
      case 'inventory.low_stock.threshold':
        value = '20'
        description = 'Percentage threshold for low stock alerts'
        configType = 'NUMBER'
        break
      case 'asset.barcode.format':
        value = 'CODE128'
        description = 'Default barcode format'
        break
      case 'system.timezone':
        value = 'UTC'
        description = 'System timezone'
        break
      case 'system.language':
        value = 'en'
        description = 'System language'
        break
      case 'security.session.timeout':
        value = '3600'
        description = 'Session timeout in seconds'
        configType = 'NUMBER'
        break
      case 'report.export.format':
        value = 'PDF'
        description = 'Default report export format'
        break
      case 'asset.auto_archive.days':
        value = '365'
        description = 'Days before auto-archiving retired assets'
        configType = 'NUMBER'
        break
      case 'transfer.approval.required':
        value = 'true'
        description = 'Require approval for transfers'
        configType = 'BOOLEAN'
        break
      case 'request.auto_approve.threshold':
        value = '0'
        description = 'Auto-approve threshold (0 = disabled)'
        configType = 'NUMBER'
        break
      case 'maintenance.schedule.auto':
        value = 'false'
        description = 'Auto-schedule preventive maintenance'
        configType = 'BOOLEAN'
        break
      case 'notification.batch.size':
        value = '100'
        description = 'Batch size for sending notifications'
        configType = 'NUMBER'
        break
      case 'audit.log.retention.days':
        value = '365'
        description = 'Days to retain audit logs'
        configType = 'NUMBER'
        break
      case 'backup.frequency':
        value = 'daily'
        description = 'Backup frequency'
        break
      case 'backup.location':
        value = '/backups'
        description = 'Backup storage location'
        break
      case 'system.maintenance.mode':
        value = 'false'
        description = 'System maintenance mode'
        configType = 'BOOLEAN'
        break
      case 'feature.barcode.scanning':
        value = 'true'
        description = 'Enable barcode scanning feature'
        configType = 'BOOLEAN'
        break
      case 'feature.file.upload.max_size':
        value = '10485760'
        description = 'Maximum file upload size in bytes (10MB)'
        configType = 'NUMBER'
        break
    }

    const config = await prisma.systemConfig.create({
      data: {
        key,
        value,
        description,
        category,
        updatedBy: admins[0].id,
      },
    })
    systemConfigs.push(config)
  }

  console.log(`✅ Created ${systemConfigs.length} system configurations`)

  // ==================== SUMMARY ====================
  console.log('\n🎉 Database seeding completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`   👥 Users: ${await prisma.user.count()}`)
  console.log(`   📦 Assets: ${await prisma.asset.count()}`)
  console.log(`   📋 Requests: ${await prisma.request.count()}`)
  console.log(`   🔄 Transfers: ${await prisma.transfer.count()}`)
  console.log(`   🔧 Maintenance: ${await prisma.maintenance.count()}`)
  console.log(`   🔔 Notifications: ${await prisma.notification.count()}`)
  console.log(`   📝 Activity Logs: ${await prisma.activityLog.count()}`)
  console.log(`   ✅ Approvals: ${await prisma.approval.count()}`)
  console.log(`   ⚙️  System Configs: ${await prisma.systemConfig.count()}`)
  console.log('\n✨ You can now log in with the test accounts!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
