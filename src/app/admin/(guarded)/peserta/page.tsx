import prisma from "@/lib/prisma";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const take = 50;
  const skip = (page - 1) * take;

  const [participants, totalCount] = await Promise.all([
    prisma.participant.findMany({
      take,
      skip,
    include: {
      registrations: {
        include: { competition: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  }),
    prisma.participant.count()
  ]);

  const totalPages = Math.ceil(totalCount / take);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-arang">Master Data Peserta</h1>
        <p className="text-gray-500 mt-2">Seluruh warga yang mendaftar perlombaan.</p>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>No. HP</TableHead>
              <TableHead>Blok/Rumah</TableHead>
              <TableHead>Perlombaan Diikuti</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-gray-500">Belum ada peserta.</TableCell>
              </TableRow>
            ) : (
              participants.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.phone}</TableCell>
                  <TableCell>{p.houseBlock} - {p.houseNumber}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.registrations.map(reg => (
                        <Badge key={reg.id} variant="outline" className="text-xs bg-gray-50">
                          {reg.competition.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Link 
            href={page > 1 ? `/admin/peserta?page=${page - 1}` : "#"}
            className={buttonVariants({ variant: "outline", className: page <= 1 ? "pointer-events-none opacity-50" : "" })}
          >
            Prev
          </Link>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Link 
            href={page < totalPages ? `/admin/peserta?page=${page + 1}` : "#"}
            className={buttonVariants({ variant: "outline", className: page >= totalPages ? "pointer-events-none opacity-50" : "" })}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
