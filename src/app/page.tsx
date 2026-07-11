import { BuntingStrip } from "@/components/bunting-strip";
import { Countdown } from "@/components/countdown";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const competitions = await prisma.competition.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { createdAt: "desc" },
  });

  const setting = await prisma.setting.findUnique({
    where: { key: "showLineupAnnouncement" },
  });
  const showLineupAnnouncement = setting ? setting.value === "true" : true;

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
          <Card className="mt-8 w-full border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-anton text-2xl text-merah">LINEUP LOMBA</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {competitions.map(comp => (
                  <li key={comp.id} className="flex justify-between items-center bg-surface border border-arang/10 p-3 rounded-md">
                    <span className="font-semibold text-arang">{comp.name}</span>
                    <span className="text-sm font-jetbrains bg-arang/5 text-arang px-2 py-1 rounded">
                      {comp.teamSize === 1 ? 'Perorangan' : comp.teamSize === 2 ? 'Ganda' : `${comp.teamSize}v${comp.teamSize}`}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            {showLineupAnnouncement && (
              <CardFooter className="flex flex-col items-center gap-1 text-center bg-arang/[0.02] border-t border-border py-4 px-5">
                <p className="text-xs font-semibold text-merah tracking-wider uppercase">📢 Lineup Belum Final</p>
                <p className="text-xs text-arang/70 leading-relaxed font-jakarta">
                  Daftar di atas adalah lomba yang saat ini dibuka untuk pendaftaran. Nantikan kehadiran lomba seru lainnya yang akan segera menyusul!
                </p>
              </CardFooter>
            )}
          </Card>
        )}

        <div className="mt-6 w-full mb-12 flex flex-col gap-3">
          <Link href="/lomba" className="inline-flex items-center justify-center w-full bg-merah hover:bg-merah-tua text-putih-kertas text-lg py-6 rounded-xl font-bold transition-colors">
            Daftar Lomba
          </Link>
          <Link href="/juara" className="inline-flex items-center justify-center w-full bg-surface border border-emas text-emas hover:bg-emas/5 text-lg py-6 rounded-xl font-bold transition-colors shadow-sm">
            🏆 Galeri Juara
          </Link>
        </div>
      </div>
    </main>
  );
}
