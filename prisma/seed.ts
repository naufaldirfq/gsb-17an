import { PrismaClient, PairingMode, BracketFormat } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const competitions = [
    {
      name: 'Tenis Meja',
      slug: 'tenis-meja',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    {
      name: 'Bulu Tangkis',
      slug: 'bulu-tangkis',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    {
      name: 'Padel',
      slug: 'padel',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    {
      name: 'Basket 3x3',
      slug: 'basket-3x3',
      teamSize: 3,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
  ]

  for (const comp of competitions) {
    await prisma.competition.upsert({
      where: { slug: comp.slug },
      update: comp,
      create: comp,
    })
  }

  console.log('Seed executed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
