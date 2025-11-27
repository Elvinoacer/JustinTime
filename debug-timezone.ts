import { PrismaClient } from './src/generated/prisma'
import { getAvailableSlots } from './src/lib/utils/availability'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Debugging Timezone/Date Handling...')

    // 1. Create a test provider
    const provider = await prisma.user.create({
      data: {
        name: "Timezone Test Provider",
        email: `tz_test_${Date.now()}@example.com`,
        role: "PROVIDER",
        password: "password123",
      }
    })
    console.log(`✅ Created provider: ${provider.id}`)

    // 2. Set availability for Monday (Day 1)
    await prisma.availability.create({
      data: {
        providerId: provider.id,
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
      }
    })
    console.log('✅ Set availability: Monday 09:00 - 17:00')

    // 3. Find next Monday
    const today = new Date()
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7))
    if (nextMonday <= today) {
        nextMonday.setDate(nextMonday.getDate() + 7)
    }
    
    // Format as YYYY-MM-DD string (simulating frontend input)
    const dateStr = nextMonday.toISOString().split('T')[0]
    console.log(`📅 Testing date string: ${dateStr}`)

    // 4. Simulate API behavior: parsing string to Date
    // new Date("2025-12-01") -> UTC midnight
    const apiDate = new Date(dateStr)
    console.log(`📡 API parsed date (UTC): ${apiDate.toISOString()}`)
    console.log(`   API parsed date (Local): ${apiDate.toString()}`)
    console.log(`   Day of week (getUTCDay): ${apiDate.getUTCDay()}`)
    console.log(`   Day of week (getDay): ${apiDate.getDay()}`)

    // 5. Call getAvailableSlots
    console.log('🔄 Calling getAvailableSlots...')
    const slots = await getAvailableSlots(provider.id, apiDate, 60)
    console.log(`🕒 Slots returned: ${slots.length}`)
    console.log('   Slots:', slots)

    if (slots.length > 0) {
        console.log('✅ Slots found! Logic seems OK for this date.')
    } else {
        console.error('❌ No slots found. Likely timezone issue.')
        console.log(`   Expected slots for Day ${apiDate.getDay()} (from date object passed)`)
        
        // Check what day the availability is actually set for
        const avail = await prisma.availability.findFirst({
            where: { providerId: provider.id }
        })
        console.log(`   DB Availability is for Day: ${avail?.dayOfWeek}`)
        
        if (avail?.dayOfWeek !== apiDate.getDay()) {
            console.error(`   MISMATCH: DB has Day ${avail?.dayOfWeek}, but Date object is Day ${apiDate.getDay()}`)
        }
    }

    // Cleanup
    await prisma.availability.deleteMany({ where: { providerId: provider.id } })
    await prisma.user.delete({ where: { id: provider.id } })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
