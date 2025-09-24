import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Cleanup before seeding
  await prisma.manifest.deleteMany();
  await prisma.student.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.user.deleteMany();

  // Create Drivers
  const driver1 = await prisma.user.create({
    data: {
      name: "John Driver",
      email: "john.driver@example.com",
      password: await bcrypt.hash("driver123", 10),
      role: "driver",
    },
  });

  const driver2 = await prisma.user.create({
    data: {
      name: "Mike Driver",
      email: "mike.driver@example.com",
      password: await bcrypt.hash("driver123", 10),
      role: "driver",
    },
  });

  // Create Assistants
  const assistant1 = await prisma.user.create({
    data: {
      name: "Alice Assistant",
      email: "alice.assistant@example.com",
      password: await bcrypt.hash("assistant123", 10),
      role: "assistant",
    },
  });

  const assistant2 = await prisma.user.create({
    data: {
      name: "Bob Assistant",
      email: "bob.assistant@example.com",
      password: await bcrypt.hash("assistant123", 10),
      role: "assistant",
    },
  });

  // Create Bus
  const bus = await prisma.bus.create({
    data: {
      name: "Morning Express",
      plateNumber: "KAA123X",
      capacity: 40,
      route: "Route A - City to School",
      driverId: driver1.id,
      assistantId: assistant1.id,
    },
  });

  // Create Parents
  const parent1 = await prisma.parent.create({
    data: {
      name: "Jane Parent",
      phone: "0700000001",
      email: "jane.parent@example.com",
    },
  });

  const parent2 = await prisma.parent.create({
    data: {
      name: "Paul Parent",
      phone: "0700000002",
      email: "paul.parent@example.com",
    },
  });

  // Create Students
  const student1 = await prisma.student.create({
    data: {
      name: "Emma Student",
      grade: "Grade 5",
      latitude: -1.2921,
      longitude: 36.8219,
      busId: bus.id,
      parentId: parent1.id,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      name: "Liam Student",
      grade: "Grade 6",
      latitude: -1.3000,
      longitude: 36.8200,
      busId: bus.id,
      parentId: parent1.id,
    },
  });

  const student3 = await prisma.student.create({
    data: {
      name: "Sophia Student",
      grade: "Grade 4",
      latitude: -1.3100,
      longitude: 36.8300,
      busId: bus.id,
      parentId: parent2.id,
    },
  });

  // Create Manifests (Check-in and Check-out with GPS)
  await prisma.manifest.createMany({
    data: [
      {
        studentId: student1.id,
        busId: bus.id,
        assistantId: assistant1.id,
        status: "CHECKED_IN",
        latitude: -1.2921,
        longitude: 36.8219,
      },
      {
        studentId: student1.id,
        busId: bus.id,
        assistantId: assistant1.id,
        status: "CHECKED_OUT",
        latitude: -1.2922,
        longitude: 36.8220,
      },
      {
        studentId: student2.id,
        busId: bus.id,
        assistantId: assistant1.id,
        status: "CHECKED_IN",
        latitude: -1.3000,
        longitude: 36.8200,
      },
      {
        studentId: student3.id,
        busId: bus.id,
        assistantId: assistant1.id,
        status: "CHECKED_IN",
        latitude: -1.3100,
        longitude: 36.8300,
      },
    ],
  });

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
