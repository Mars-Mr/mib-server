import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    create: {
      username: 'admin',
      passwordHash: hash,
      role: UserRole.ADMIN,
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { username: 'coach' },
    create: {
      username: 'coach',
      passwordHash: hash,
      role: UserRole.COACH,
    },
    update: {},
  });
  console.log('Seed: admin / coach password: 123456');
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
