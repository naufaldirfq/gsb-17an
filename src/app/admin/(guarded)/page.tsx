import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddCompetitionModal } from "./add-competition-modal";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const competitions = await prisma.competition.findMany({
    include: {
      _count: {
        select: { registrations: true, teams: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-arang">Dashboard Admin</h1>
          <p className="text-gray-500 mt-2">Ringkasan status perlombaan GSB.</p>
        </div>
        <AddCompetitionModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitions.map((comp) => (
          <Card key={comp.id} className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl text-merah">{comp.name}</CardTitle>
                <Badge 
                  variant={comp.status === "REGISTRATION" ? "default" : "secondary"}
                  className={comp.status === "REGISTRATION" ? "bg-emas text-arang hover:bg-emas/80" : ""}
                >
                  {comp.status}
                </Badge>
              </div>
              <CardDescription className="text-xs text-gray-500">
                {comp.teamSize === 1 ? "Perorangan" : comp.teamSize === 2 ? "Ganda" : "3v3"} | {comp.pairingMode} | {comp.bracketFormat}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4 text-sm">
                <div>
                  <span className="font-semibold">{comp._count.registrations}</span> Peserta
                </div>
                <div>
                  <span className="font-semibold">{comp._count.teams}</span> Tim
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/lomba/${comp.slug}`} className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all h-8 px-2.5 w-full bg-merah hover:bg-merah-tua text-white">
                  Kelola
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {competitions.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
            Belum ada perlombaan yang dikonfigurasi.
          </div>
        )}
      </div>
    </div>
  );
}
