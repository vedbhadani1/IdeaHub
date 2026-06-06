import prisma from './src/config/db';

async function main() {
  try {
    const totalActive = await prisma.post.count({ where: { status: { not: 'DONE' } } });
    console.log('Total Active:', totalActive);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
