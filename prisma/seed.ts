import { PrismaClient, PairingMode, BracketFormat } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const competitions = [
    // Tenis Meja
    {
      name: 'Tenis Meja (Bapak-bapak)',
      slug: 'tenis-meja-bapak-bapak',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    {
      name: 'Tenis Meja (Ibu-ibu)',
      slug: 'tenis-meja-ibu-ibu',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    {
      name: 'Tenis Meja (Anak-anak)',
      slug: 'tenis-meja-anak-anak',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    // Bulu Tangkis
    {
      name: 'Bulu Tangkis (Bapak-bapak)',
      slug: 'bulu-tangkis-bapak-bapak',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    {
      name: 'Bulu Tangkis (Ibu-ibu)',
      slug: 'bulu-tangkis-ibu-ibu',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    {
      name: 'Bulu Tangkis (Anak-anak)',
      slug: 'bulu-tangkis-anak-anak',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    // Padel
    {
      name: 'Padel (Bapak-bapak)',
      slug: 'padel-bapak-bapak',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
      description: 'Padel ganda putra dengan format Americano',
    },
    {
      name: 'Padel (Ibu-ibu)',
      slug: 'padel-ibu-ibu',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    {
      name: 'Padel (Anak-anak)',
      slug: 'padel-anak-anak',
      teamSize: 2,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    // Basket 3x3
    {
      name: 'Basket 3x3 (Bapak-bapak)',
      slug: 'basket-3x3-bapak-bapak',
      teamSize: 3,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    {
      name: 'Basket 3x3 (Ibu-ibu)',
      slug: 'basket-3x3-ibu-ibu',
      teamSize: 3,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    {
      name: 'Basket 3x3 (Anak-anak)',
      slug: 'basket-3x3-anak-anak',
      teamSize: 3,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    // Voli Air
    {
      name: 'Voli Air (Bapak-bapak)',
      slug: 'voli-air-bapak-bapak',
      teamSize: 4,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    {
      name: 'Voli Air (Ibu-ibu)',
      slug: 'voli-air-ibu-ibu',
      teamSize: 4,
      pairingMode: PairingMode.RANDOM,
      bracketFormat: BracketFormat.SINGLE_ELIM,
    },
    // Treasure Hunt
    {
      name: 'Treasure Hunt (Bapak-bapak)',
      slug: 'treasure-hunt-bapak-bapak',
      teamSize: 1,
      pairingMode: PairingMode.SOLO,
      bracketFormat: BracketFormat.LEADERBOARD,
    },
    {
      name: 'Treasure Hunt (Ibu-ibu)',
      slug: 'treasure-hunt-ibu-ibu',
      teamSize: 1,
      pairingMode: PairingMode.SOLO,
      bracketFormat: BracketFormat.LEADERBOARD,
    },
    {
      name: 'Treasure Hunt (Anak-anak)',
      slug: 'treasure-hunt-anak-anak',
      teamSize: 1,
      pairingMode: PairingMode.SOLO,
      bracketFormat: BracketFormat.LEADERBOARD,
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
