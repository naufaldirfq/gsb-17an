import { BuntingStrip } from "@/components/bunting-strip";
import { Countdown } from "@/components/countdown";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const competitions = await prisma.competition.findMany({
    where: { status: { not: "DRAFT" } },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="flex flex-col items-center w-full min-h-screen relative overflow-hidden">
      <BuntingStrip />

      <div className="flex flex-col items-center text-center mt-24 px-6 gap-6 max-w-md w-full">
        <div className="flex flex-col gap-1 items-center">
          <p className="font-anton text-merah text-xl tracking-widest">DIRGAHAYU RI KE-81</p>
          <h1 className="font-anton text-5xl text-arang tracking-wide">
            L O M B A <br /> 1 7 - A N
          </h1>
          <p className="font-jakarta font-medium text-arang/80 text-lg mt-2">
            Green Serpong Bintaro
          </p>
        </div>

        <div className="mt-8 w-full flex flex-col items-center">
          <p className="font-anton text-arang/60 text-lg mb-2">MENUJU 17 AGUSTUS</p>
          <Countdown />
        </div>

        {competitions.length > 0 && (
          <div className="mt-8 w-full text-left bg-surface border border-border rounded-[12px] p-5">
            <h2 className="font-anton text-2xl text-merah mb-3">LINEUP LOMBA</h2>
            <ul className="flex flex-col gap-2">
              {competitions.map(comp => (
                <li key={comp.id} className="flex justify-between items-center pb-2 border-b border-arang/5 last:border-0 last:pb-0">
                  <span className="font-medium text-arang">{comp.name}</span>
                  <span className="text-xs bg-arang/5 px-2 py-1 rounded font-jetbrains font-bold text-arang/60">
                    {comp.teamSize === 1 ? "Perorangan" : `${comp.teamSize} Orang`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 w-full mb-12">
          <Link href="/lomba" className="inline-flex items-center justify-center w-full bg-merah hover:bg-merah-tua text-putih-kertas text-lg py-6 rounded-xl font-bold transition-colors">
            Daftar Lomba
          </Link>
        </div>
      </div>
    </main>
  );
}
