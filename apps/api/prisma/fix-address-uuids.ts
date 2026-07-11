import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADDRESS_FIXES = [
  {
    oldId: '00000000-0000-0000-0000-000000000001',
    newId: '11111111-1111-4111-8111-111111111101',
  },
  {
    oldId: '00000000-0000-0000-0000-000000000002',
    newId: '11111111-1111-4111-8111-111111111102',
  },
];

async function main() {
  for (const { oldId, newId } of ADDRESS_FIXES) {
    const existing = await prisma.address.findUnique({ where: { id: oldId } });
    if (!existing) continue;

    const alreadyFixed = await prisma.address.findUnique({ where: { id: newId } });
    if (alreadyFixed) {
      await prisma.order.updateMany({
        where: { addressId: oldId },
        data: { addressId: newId },
      });
      await prisma.address.delete({ where: { id: oldId } });
      continue;
    }

    const {
      id: _id,
      createdAt,
      updatedAt,
      ...addressData
    } = existing;

    await prisma.address.create({
      data: {
        ...addressData,
        id: newId,
      },
    });

    await prisma.order.updateMany({
      where: { addressId: oldId },
      data: { addressId: newId },
    });

    await prisma.address.delete({ where: { id: oldId } });
  }

  console.log('Address UUID fix applied.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
