// testPrisma.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    // Fetch all users (adjust according to your schema)
    const users = await prisma.user.findMany();
    console.log(users);
  } catch (error) {
    console.error('Error connecting to the database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
