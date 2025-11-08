import { PrismaClient } from '../lib/prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'
import { AssetType, AssetStatus, RequestStatus, TransferStatus } from '../lib/prisma/enums'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create Faculty Admin
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@university.edu' },
    update: {},
    create: {
      email: 'admin@university.edu',
      password: adminPassword,
      name: 'Faculty Admin',
      role: 'FACULTY_ADMIN',
      department: 'Administration',
      employeeId: 'ADM001',
    },
  })

  // Create Departmental Officers
  const officerPassword = await bcrypt.hash('officer123', 10)
  const officer = await prisma.user.upsert({
    where: { email: 'officer@university.edu' },
    update: {},
    create: {
      email: 'officer@university.edu',
      password: officerPassword,
      name: 'Departmental Officer',
      role: 'DEPARTMENTAL_OFFICER',
      department: 'Computer Science',
      employeeId: 'OFF001',
    },
  })

  await prisma.user.upsert({
    where: { email: 'officer2@university.edu' },
    update: {},
    create: {
      email: 'officer2@university.edu',
      password: officerPassword,
      name: 'Sarah Johnson',
      role: 'DEPARTMENTAL_OFFICER',
      department: 'Mathematics',
      employeeId: 'OFF002',
    },
  })

  // Create Lecturers
  const lecturerPassword = await bcrypt.hash('lecturer123', 10)
  await prisma.user.upsert({
    where: { email: 'lecturer@university.edu' },
    update: {},
    create: {
      email: 'lecturer@university.edu',
      password: lecturerPassword,
      name: 'Dr. John Lecturer',
      role: 'LECTURER',
      department: 'Computer Science',
      employeeId: 'LEC001',
    },
  })

  const lecturers = [
    { email: 'lecturer2@university.edu', name: 'Dr. Jane Smith', department: 'Computer Science', employeeId: 'LEC002' },
    { email: 'lecturer3@university.edu', name: 'Prof. Michael Brown', department: 'Mathematics', employeeId: 'LEC003' },
    { email: 'lecturer4@university.edu', name: 'Dr. Emily Davis', department: 'Physics', employeeId: 'LEC004' },
    { email: 'lecturer5@university.edu', name: 'Prof. Robert Wilson', department: 'Computer Science', employeeId: 'LEC005' },
  ]

  for (const lec of lecturers) {
    await prisma.user.upsert({
      where: { email: lec.email },
      update: {},
      create: {
        ...lec,
        password: lecturerPassword,
        role: 'LECTURER',
      },
    })
  }

  // Create Course Reps
  const repPassword = await bcrypt.hash('rep123', 10)
  await prisma.user.upsert({
    where: { email: 'rep@university.edu' },
    update: {},
    create: {
      email: 'rep@university.edu',
      password: repPassword,
      name: 'Course Representative',
      role: 'COURSE_REP',
      department: 'Computer Science',
      employeeId: 'REP001',
    },
  })

  const reps = [
    { email: 'rep2@university.edu', name: 'Alex Thompson', department: 'Mathematics', employeeId: 'REP002' },
    { email: 'rep3@university.edu', name: 'Maria Garcia', department: 'Physics', employeeId: 'REP003' },
  ]

  for (const r of reps) {
    await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: {
        ...r,
        password: repPassword,
        role: 'COURSE_REP',
      },
    })
  }

  console.log('✅ Users created')

  // Create Assets
  const assetTypes = [
    { type: AssetType.EQUIPMENT, count: 20 },
    { type: AssetType.CONSUMABLE, count: 30 },
    { type: AssetType.TEACHING_AID, count: 25 },
    { type: AssetType.FURNITURE, count: 15 },
    { type: AssetType.OTHER, count: 10 },
  ]

  const manufacturers = ['Dell', 'HP', 'Lenovo', 'Apple', 'Samsung', 'Canon', 'Epson', 'Microsoft', 'Logitech', 'Sony']
  const locations = ['Lab A', 'Lab B', 'Library', 'Lecture Hall 1', 'Lecture Hall 2', 'Office Block A', 'Office Block B', 'Storage Room']
  const categories = {
    [AssetType.EQUIPMENT]: ['Laptop', 'Desktop', 'Projector', 'Printer', 'Scanner', 'Tablet', 'Monitor', 'Server'],
    [AssetType.CONSUMABLE]: ['Paper', 'Ink Cartridge', 'Toner', 'USB Drive', 'Cables', 'Batteries', 'Markers', 'Notebooks'],
    [AssetType.TEACHING_AID]: ['Whiteboard', 'Marker Board', 'Models', 'Charts', 'Posters', 'Maps', 'Globes', 'Calculators'],
    [AssetType.FURNITURE]: ['Desk', 'Chair', 'Cabinet', 'Bookshelf', 'Table', 'Filing Cabinet', 'Whiteboard Stand'],
    [AssetType.OTHER]: ['Tool Kit', 'Extension Cord', 'Adapter', 'Stand', 'Mount', 'Case', 'Bag'],
  }

  const assets = []
  let assetCounter = 1

  for (const { type, count } of assetTypes) {
    for (let i = 0; i < count; i++) {
      const prefix = type.substring(0, 3).toUpperCase()
      const assetCode = `${prefix}-${String(assetCounter).padStart(6, '0')}`
      const category = categories[type][Math.floor(Math.random() * categories[type].length)]
      const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)]
      const location = locations[Math.floor(Math.random() * locations.length)]
      const purchaseDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
      const purchasePrice = Math.floor(Math.random() * 5000) + 100
      
      // Randomly assign status
      const statuses = [AssetStatus.AVAILABLE, AssetStatus.AVAILABLE, AssetStatus.AVAILABLE, AssetStatus.ALLOCATED, AssetStatus.MAINTENANCE]
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      
      // If allocated, assign to a random lecturer
      let allocatedTo = null
      if (status === AssetStatus.ALLOCATED) {
        const allLecturers = await prisma.user.findMany({ where: { role: 'LECTURER' } })
        if (allLecturers.length > 0) {
          allocatedTo = allLecturers[Math.floor(Math.random() * allLecturers.length)].id
        }
      }

      const asset = await prisma.asset.create({
        data: {
          name: `${category} ${manufacturer} ${assetCounter}`,
          description: `${type} asset for ${category.toLowerCase()} purposes`,
          assetCode,
          type,
          category,
          location,
          purchaseDate,
          purchasePrice,
          serialNumber: `SN${String(assetCounter).padStart(8, '0')}`,
          manufacturer,
          model: `Model-${assetCounter}`,
          registeredBy: officer.id,
          status,
          allocatedTo,
        },
      })
      assets.push(asset)
      assetCounter++
    }
  }

  console.log(`✅ ${assets.length} Assets created`)

  // Create Requests
  const availableAssets = assets.filter(a => a.status === AssetStatus.AVAILABLE)
  const allLecturers = await prisma.user.findMany({ where: { role: 'LECTURER' } })
  const purposes = [
    'For research project',
    'Teaching purposes',
    'Student lab work',
    'Department presentation',
    'Course demonstration',
    'Workshop preparation',
  ]

  const requests = []
  for (let i = 0; i < 15 && availableAssets.length > 0; i++) {
    const asset = availableAssets[Math.floor(Math.random() * availableAssets.length)]
    const lecturer = allLecturers[Math.floor(Math.random() * allLecturers.length)]
    const purpose = purposes[Math.floor(Math.random() * purposes.length)]
    const statuses = [RequestStatus.PENDING, RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.FULFILLED, RequestStatus.REJECTED]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    const requestedAt = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    let approvedAt = null
    let fulfilledAt = null
    
    if (status === RequestStatus.APPROVED || status === RequestStatus.FULFILLED) {
      approvedAt = new Date(requestedAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
    }
    if (status === RequestStatus.FULFILLED) {
      fulfilledAt = new Date(approvedAt!.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000)
      // Update asset to allocated
      await prisma.asset.update({
        where: { id: asset.id },
        data: { status: AssetStatus.ALLOCATED, allocatedTo: lecturer.id }
      })
    }

    const request = await prisma.request.create({
      data: {
        assetId: asset.id,
        requestedBy: lecturer.id,
        purpose,
        status,
        requestedAt,
        approvedAt,
        fulfilledAt,
        notes: `Request notes for ${asset.name}`,
      },
    })
    requests.push(request)

    // Create approval if approved
    if (status === RequestStatus.APPROVED || status === RequestStatus.FULFILLED) {
      await prisma.approval.create({
        data: {
          requestId: request.id,
          approvedBy: officer.id,
          status: 'APPROVED',
          comments: 'Approved for use',
        },
      })
    } else if (status === RequestStatus.REJECTED) {
      await prisma.approval.create({
        data: {
          requestId: request.id,
          approvedBy: officer.id,
          status: 'REJECTED',
          comments: 'Not available at this time',
        },
      })
    }
  }

  console.log(`✅ ${requests.length} Requests created`)

  // Create Transfers
  const allocatedAssets = await prisma.asset.findMany({ 
    where: { status: AssetStatus.ALLOCATED },
    include: { allocatedToUser: true }
  })

  const transfers = []
  for (let i = 0; i < 10 && allocatedAssets.length > 0; i++) {
    const asset = allocatedAssets[Math.floor(Math.random() * allocatedAssets.length)]
    const fromUser = asset.allocatedToUser!
    const toLecturer = allLecturers.find(l => l.id !== fromUser.id) || allLecturers[0]
    
    if (!toLecturer) continue

    const reasons = [
      'Department reassignment',
      'Project transfer',
      'Temporary loan',
      'Resource sharing',
      'Collaboration need',
    ]
    const reason = reasons[Math.floor(Math.random() * reasons.length)]
    const statuses = [TransferStatus.PENDING, TransferStatus.PENDING, TransferStatus.APPROVED, TransferStatus.COMPLETED, TransferStatus.REJECTED]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    const requestedAt = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    let approvedAt = null
    let completedAt = null
    
    if (status === TransferStatus.APPROVED || status === TransferStatus.COMPLETED) {
      approvedAt = new Date(requestedAt.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000)
    }
    if (status === TransferStatus.COMPLETED) {
      completedAt = new Date(approvedAt!.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000)
      // Update asset allocation
      await prisma.asset.update({
        where: { id: asset.id },
        data: { allocatedTo: toLecturer.id }
      })
    }

    const transfer = await prisma.transfer.create({
      data: {
        assetId: asset.id,
        fromUserId: fromUser.id,
        toUserId: toLecturer.id,
        reason,
        status,
        requestedAt,
        approvedAt,
        completedAt,
        notes: `Transfer notes for ${asset.name}`,
      },
    })
    transfers.push(transfer)

    // Create approval if approved
    if (status === TransferStatus.APPROVED || status === TransferStatus.COMPLETED) {
      await prisma.approval.create({
        data: {
          transferId: transfer.id,
          approvedBy: officer.id,
          status: 'APPROVED',
          comments: 'Transfer approved',
        },
      })
    } else if (status === TransferStatus.REJECTED) {
      await prisma.approval.create({
        data: {
          transferId: transfer.id,
          approvedBy: officer.id,
          status: 'REJECTED',
          comments: 'Transfer not approved',
        },
      })
    }
  }

  console.log(`✅ ${transfers.length} Transfers created`)

  console.log('🎉 Database seeding completed!')
  console.log(`   - Users: ${await prisma.user.count()}`)
  console.log(`   - Assets: ${await prisma.asset.count()}`)
  console.log(`   - Requests: ${await prisma.request.count()}`)
  console.log(`   - Transfers: ${await prisma.transfer.count()}`)
  console.log(`   - Approvals: ${await prisma.approval.count()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
