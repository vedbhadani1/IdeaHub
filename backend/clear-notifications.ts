import prisma from './src/config/db';

async function clearNotifications() {
  try {
    const res = await prisma.$executeRaw`TRUNCATE TABLE "Notification" CASCADE;`;
    console.log('Cleared notifications table:', res);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
clearNotifications();
