"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitScoreAction } from "./actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";


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
};

export function MatchScoreModal({ match }: { match: MatchData }) {
  const [open, setOpen] = useState(false);
  const [scoreA, setScoreA] = useState<string>(match.scoreA?.toString() || "");
  const [scoreB, setScoreB] = useState<string>(match.scoreB?.toString() || "");
  const [winnerTeamId, setWinnerTeamId] = useState<string>(match.winnerTeamId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Determine if it's a valid match to score (has both teams)
  if (!match.teamA || !match.teamB) {
    return <span className="text-gray-400 text-sm">Waiting for teams</span>;
  }

  if (match.status === "COMPLETED") {
    return <span className="text-gray-500 text-sm">Completed</span>;
  }

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
    if (!winnerTeamId) return toast.error("Please select a winner");

    setIsSubmitting(true);
    try {
      const res = await submitScoreAction(match.id, {
        scoreA: parseInt(scoreA) || 0,
        scoreB: parseInt(scoreB) || 0,
        winnerTeamId,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Score updated successfully");
        setOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-merah bg-transparent shadow-sm hover:bg-merah/10 hover:text-merah text-merah h-8 px-3">
        Update Score
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Match Score</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{match.teamA.name} Score</Label>
              <Input
                type="number"
                value={scoreA}
                onChange={(e) => handleScoreChange("A", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{match.teamB.name} Score</Label>
              <Input
                type="number"
                value={scoreB}
                onChange={(e) => handleScoreChange("B", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Winner</Label>
            <Select value={winnerTeamId} onValueChange={(val) => setWinnerTeamId(val || "")} required>
              <SelectTrigger>
                <SelectValue placeholder="Select winner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={match.teamAId!}>{match.teamA.name}</SelectItem>
                <SelectItem value={match.teamBId!}>{match.teamB.name}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full bg-merah hover:bg-merah-tua text-white">
            {isSubmitting ? "Saving..." : "Save Score"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
