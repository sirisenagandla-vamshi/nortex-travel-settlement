import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { empCode: true, id: true, email: true } });
  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await bcrypt.hash(u.empCode, 10) },
    });
    console.log('reset', u.email, u.empCode);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
