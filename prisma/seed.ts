import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedRbac } from './rbac-seed';

const prisma = new PrismaClient();

async function main() {
  const { tenantId } = await seedRbac(prisma);
  const hash = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId, username: 'admin' } },
    create: {
      username: 'admin',
      passwordHash: hash,
      role: UserRole.ADMIN,
      tenantId,
    },
    update: { passwordHash: hash },
  });
  const coachUser = await prisma.user.upsert({
    where: { tenantId_username: { tenantId, username: 'coach' } },
    create: {
      username: 'coach',
      passwordHash: hash,
      role: UserRole.COACH,
      tenantId,
    },
    update: { passwordHash: hash },
  });

  await prisma.coach.upsert({
    where: { userId: coachUser.id },
    create: {
      name: 'Demo Coach',
      userId: coachUser.id,
      tenantId,
    },
    update: { tenantId },
  });

  console.log('Seed: admin / coach password: 123456 (tenant: default)');
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
