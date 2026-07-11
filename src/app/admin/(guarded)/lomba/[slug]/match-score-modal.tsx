"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitScoreAction, saveMatchRankingsAction } from "./actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MatchTeam, Team, BracketFormat } from "@prisma/client";

type MatchData = {
  id: string;
  teamAId: string | null;
  teamBId: string | null;
  teamA: { id: string; name: string } | null;
  teamB: { id: string; name: string } | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
  status: string;
  nextMatch?: { id: string; status: string } | null;
  matchTeams?: (MatchTeam & { team: Team })[];
  competition?: { bracketFormat: BracketFormat };
};

export function MatchScoreModal({ match }: { match: MatchData }) {
  const [open, setOpen] = useState(false);
  const [scoreA, setScoreA] = useState<string>(match.scoreA?.toString() || "");
  const [scoreB, setScoreB] = useState<string>(match.scoreB?.toString() || "");
  const [winnerTeamId, setWinnerTeamId] = useState<string>(match.winnerTeamId || "");
  const [rankings, setRankings] = useState<{ teamId: string; teamName: string; rank: number | null }[]>(
    match.matchTeams?.map((mt) => ({
      teamId: mt.teamId,
      teamName: mt.team.name,
      rank: mt.rank,
    })) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const isCustomFormat = match.competition?.bracketFormat === "RACE_HEATS" || match.competition?.bracketFormat === "LEADERBOARD";

  // Determine if it's a valid match to score
  if (isCustomFormat) {
    if (!match.matchTeams || match.matchTeams.length === 0) {
      return <span className="text-gray-400 text-sm">Menunggu tim</span>;
    }
  } else {
    if (!match.teamA || !match.teamB) {
      return <span className="text-gray-400 text-sm">Menunggu tim</span>;
    }
  }

  const isCompleted = match.status === "COMPLETED";
  const isNextMatchCompleted = match.nextMatch?.status === "COMPLETED";

  if (isNextMatchCompleted) {
    return <span className="text-gray-500 text-xs font-semibold bg-gray-100 py-1 px-2.5 rounded border border-gray-200">Skor Terkunci 🔒</span>;
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setScoreA(match.scoreA?.toString() || "");
      setScoreB(match.scoreB?.toString() || "");
      setWinnerTeamId(match.winnerTeamId || "");
      setRankings(
        match.matchTeams?.map((mt) => ({
          teamId: mt.teamId,
          teamName: mt.team.name,
          rank: mt.rank,
        })) || []
      );
    }
  };

  const handleScoreChange = (side: "A" | "B", val: string) => {
    if (side === "A") setScoreA(val);
    else setScoreB(val);

    const a = side === "A" ? parseInt(val) : parseInt(scoreA);
    const b = side === "B" ? parseInt(val) : parseInt(scoreB);

    if (!isNaN(a) && !isNaN(b)) {
      if (a > b) setWinnerTeamId(match.teamAId!);
      else if (b > a) setWinnerTeamId(match.teamBId!);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isCustomFormat) {
        const payload = rankings.map((r) => ({
          teamId: r.teamId,
          rank: r.rank,
        }));
        const res = await saveMatchRankingsAction(match.id, payload);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Peringkat berhasil disimpan");
          setOpen(false);
          router.refresh();
        }
      } else {
        if (!winnerTeamId) {
          toast.error("Silakan pilih pemenang");
          setIsSubmitting(false);
          return;
        }

        const res = await submitScoreAction(match.id, {
          scoreA: parseInt(scoreA) || 0,
          scoreB: parseInt(scoreB) || 0,
          winnerTeamId,
        });

        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Skor berhasil disimpan");
          setOpen(false);
          router.refresh();
        }
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-merah bg-transparent shadow-sm hover:bg-merah/10 hover:text-merah text-merah h-8 px-3 cursor-pointer">
        {isCompleted
          ? isCustomFormat
            ? "Ubah Peringkat ✏️"
            : "Ubah Skor ✏️"
          : isCustomFormat
          ? "Input Peringkat"
          : "Update Skor"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCompleted
              ? isCustomFormat
                ? "Ubah Peringkat Pertandingan"
                : "Ubah Skor Pertandingan"
              : isCustomFormat
              ? "Input Peringkat Pertandingan"
              : "Update Skor Pertandingan"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {isCustomFormat ? (
            <div className="space-y-4">
              {rankings.map((r, index) => (
                <div key={r.teamId} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                  <span className="font-medium text-arang text-sm">{r.teamName}</span>
                  <div className="w-[180px]">
                    <Select
                      value={r.rank === null ? "none" : r.rank.toString()}
                      onValueChange={(val) => {
                        const newRank = val === "none" || !val ? null : parseInt(val);
                        setRankings((prev) =>
                          prev.map((item, idx) =>
                            idx === index ? { ...item, rank: newRank } : item
                          )
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Peringkat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="1">Juara 1</SelectItem>
                        <SelectItem value="2">Juara 2</SelectItem>
                        <SelectItem value="3">Juara 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Skor {match.teamA?.name}</Label>
                  <Input
                    type="number"
                    value={scoreA}
                    onChange={(e) => handleScoreChange("A", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Skor {match.teamB?.name}</Label>
                  <Input
                    type="number"
                    value={scoreB}
                    onChange={(e) => handleScoreChange("B", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pemenang</Label>
                <Select value={winnerTeamId} onValueChange={(val) => setWinnerTeamId(val || "")} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Pemenang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={match.teamAId || ""}>{match.teamA?.name || ""}</SelectItem>
                    <SelectItem value={match.teamBId || ""}>{match.teamB?.name || ""}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <Button type="submit" disabled={isSubmitting} className="w-full bg-merah hover:bg-merah-tua text-white font-bold cursor-pointer">
            {isSubmitting ? "Menyimpan..." : isCustomFormat ? "Simpan Peringkat" : "Simpan Skor"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
