import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { closeRegistrationAction, openRegistrationAction } from "./actions";

export default async function CompetitionManagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const comp = await prisma.competition.findUnique({
    where: { slug: resolvedParams.slug },
    include: {
      registrations: {
        include: { participant: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!comp) return notFound();

  const isRegistration = comp.status === "REGISTRATION";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-arang">{comp.name}</h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            Status: <Badge variant={isRegistration ? "default" : "secondary"}>{comp.status}</Badge>
          </p>
        </div>
        <div className="flex gap-4">
          {isRegistration ? (
            <form action={closeRegistrationAction.bind(null, comp.id)}>
              <Button type="submit" variant="destructive">Tutup Pendaftaran (LOCKED)</Button>
            </form>
          ) : (
            <form action={openRegistrationAction.bind(null, comp.id)}>
              <Button type="submit" variant="outline">Buka Pendaftaran</Button>
            </form>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-arang">Daftar Pendaftar ({comp.registrations.length})</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>No. HP</TableHead>
              <TableHead>Blok/Rumah</TableHead>
              <TableHead>Tanggal Daftar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comp.registrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-gray-500">Belum ada peserta yang mendaftar.</TableCell>
              </TableRow>
            ) : (
              comp.registrations.map(reg => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.participant.name}</TableCell>
                  <TableCell>{reg.participant.phone}</TableCell>
                  <TableCell>{reg.participant.houseBlock} - {reg.participant.houseNumber}</TableCell>
                  <TableCell>{reg.createdAt.toLocaleDateString("id-ID")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
