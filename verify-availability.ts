import { PrismaClient } from './src/generated/prisma'
import { getAvailableSlots } from './src/lib/utils/availability'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Verifying Availability Logic...')

    // 1. Create a test provider
    const provider = await prisma.user.create({
      data: {
        name: "Test Provider",
        email: `testprovider_${Date.now()}@example.com`,
        role: "PROVIDER",
        password: "password123",
      }
    })
    console.log(`✅ Created test provider: ${provider.id}`)

    // 2. Set availability for Monday (Day 1) 09:00 - 12:00
    await prisma.availability.create({
      data: {
        providerId: provider.id,
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "12:00",
        isActive: true,
      }
    })
    console.log('✅ Set availability: Monday 09:00 - 12:00')

    // 3. Find next Monday
    const today = new Date()
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7))
    if (nextMonday <= today) {
        nextMonday.setDate(nextMonday.getDate() + 7)
    }
    console.log(`📅 Checking slots for: ${nextMonday.toISOString().split('T')[0]}`)

    // 4. Get available slots (assuming 60 min duration)
    const slots = await getAvailableSlots(provider.id, nextMonday, 60)
    console.log('🕒 Generated Slots:', slots)

    // Expected: 09:00, 09:15, 09:30, ... up to 11:00 (since 11:00+60m = 12:00)
    // Actually, the logic is: currentMinutes + duration <= endMinutes
    // 09:00 + 60 = 10:00 <= 12:00 (OK)
    // ...
    // 11:00 + 60 = 12:00 <= 12:00 (OK)
    // 11:15 + 60 = 12:15 > 12:00 (NO)

    if (slots.includes("09:00") && slots.includes("11:00") && !slots.includes("11:15")) {
        console.log('✅ Basic slot generation verified')
    } else {
        console.error('❌ Slot generation mismatch')
    }

    // 5. Create a booking slot to block 10:00 - 11:00
    const booking = await prisma.booking.create({
        data: {
            providerId: provider.id,
            clientId: provider.id, // Self-booking for test
            serviceId: "test-service", // Dummy
            date: nextMonday,
            startTime: "10:00",
            endTime: "11:00",
            status: "CONFIRMED",
            totalAmount: 100,
            slots: {
                create: [{
                    date: nextMonday,
                    startTime: "10:00",
                    endTime: "11:00"
                }]
            }
        }
    })
    console.log('✅ Created booking: 10:00 - 11:00')

    // 6. Check slots again
    const slotsAfterBooking = await getAvailableSlots(provider.id, nextMonday, 60)
    console.log('🕒 Slots after booking:', slotsAfterBooking)

    // Expected: 10:00 should be gone.
    // Also 09:15 (ends 10:15) should be gone.
    // 09:00 (ends 10:00) should be OK?
    // Logic: (currentMinutes < bookingEndMinutes) && (slotEndMinutes > bookingStartMinutes)
    // 09:00-10:00 vs 10:00-11:00:
    // (540 < 660) && (600 > 600) -> False (No overlap) -> OK

    // 09:15-10:15 vs 10:00-11:00:
    // (555 < 660) && (615 > 600) -> True (Overlap) -> Blocked

    if (slotsAfterBooking.includes("09:00") && !slotsAfterBooking.includes("10:00") && !slotsAfterBooking.includes("09:15")) {
        console.log('✅ Conflict detection verified')
    } else {
        console.error('❌ Conflict detection mismatch')
    }

    // Cleanup
    await prisma.booking.deleteMany({ where: { providerId: provider.id } })
    await prisma.availability.deleteMany({ where: { providerId: provider.id } })
    await prisma.user.delete({ where: { id: provider.id } })
    console.log('🧹 Cleanup complete')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
