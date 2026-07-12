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
import { Printer } from "lucide-react";
import { DeleteButton } from "./delete-button";
import { deleteCompetitionAction } from "../actions";
import { AnnouncementToggle } from "./announcement-toggle";
import { DeadlineSettings } from "./deadline-settings";

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

  const setting = await prisma.setting.findUnique({
    where: { key: "showLineupAnnouncement" },
  });
  const showLineupAnnouncement = setting ? setting.value === "true" : true;

  const deadlineSetting = await prisma.setting.findUnique({
    where: { key: "registrationDeadline" },
  });
  const deadline = deadlineSetting?.value || "2026-07-31T23:59:59+07:00";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-arang">Dashboard Admin</h1>
          <p className="text-gray-500 mt-2">Ringkasan status perlombaan GSB.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/admin/print/laporan"
            target="_blank"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 h-10 px-4 gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Cetak Laporan Event
          </a>
          <AddCompetitionModal />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <AnnouncementToggle initialShow={showLineupAnnouncement} />
        <DeadlineSettings initialDeadline={deadline} />
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

              <div className="my-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-500 w-16 shrink-0">Waktu:</span>
                  <div className="min-w-0 flex-1">
                    {comp.heldAt ? (
                      <span className="text-gray-700 truncate block" title={comp.heldAt}>{comp.heldAt}</span>
                    ) : (
                      <span className="inline-flex items-center text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Belum Diatur
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-500 w-16 shrink-0">Lokasi:</span>
                  <div className="min-w-0 flex-1">
                    {comp.location ? (
                      <span className="text-gray-700 truncate block" title={comp.location}>{comp.location}</span>
                    ) : (
                      <span className="inline-flex items-center text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Belum Diatur
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-500 w-16 shrink-0">Deskripsi:</span>
                  <div className="min-w-0 flex-1">
                    {comp.description ? (
                      <span className="text-gray-700 line-clamp-1" title={comp.description}>{comp.description}</span>
                    ) : (
                      <span className="inline-flex items-center text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Belum Ada
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-500 w-16 shrink-0">Peraturan:</span>
                  <div className="min-w-0 flex-1">
                    {comp.rules ? (
                      <span className="text-gray-700 line-clamp-1" title={comp.rules}>{comp.rules}</span>
                    ) : (
                      <span className="inline-flex items-center text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Belum Ada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href={`/admin/lomba/${comp.slug}`} className="flex-1 inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all h-8 px-2.5 bg-merah hover:bg-merah-tua text-white">
                  Kelola
                </Link>
                <DeleteButton
                  id={comp.id}
                  action={deleteCompetitionAction}
                  confirmMessage={`Apakah Anda yakin ingin menghapus perlombaan "${comp.name}"? Semua data pendaftaran, tim, dan pertandingan yang terkait akan dihapus secara permanen.`}
                  size="sm"
                  variant="outline"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer h-8 w-8 p-0"
                />
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
