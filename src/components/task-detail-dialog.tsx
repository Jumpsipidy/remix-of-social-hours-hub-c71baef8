import { Link } from "@tanstack/react-router";
import { Calendar, Clock, MapPin, Users, Building2, MessageCircle, CalendarCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cityOf } from "@/lib/cities";
import { LeafletMap } from "./leaflet-map";

type T = {
  id: string; organization_id: string; title: string; description: string; task_date: string;
  start_time: string | null; end_time: string | null; available_hours: number; location: string;
  spots_total: number; address?: string | null; latitude?: number | null; longitude?: number | null; city?: string | null;
};

/** Task details popup: info, map, org profile, message and reserve actions. */
export function TaskDetailDialog({ task, orgName, onClose, onReserve }: {
  task: T | null; orgName: string; onClose: () => void; onReserve: (t: T) => void;
}) {
  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {task && (
          <>
            <DialogHeader>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold">
                <Building2 className="h-3 w-3" /> {orgName}
              </div>
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              <DialogDescription className="whitespace-pre-line">{task.description || "Aprašymo nėra."}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Info icon={Calendar} text={task.task_date} />
              {task.start_time && <Info icon={Clock} text={`${task.start_time.slice(0, 5)}–${task.end_time?.slice(0, 5) ?? ""}`} />}
              <Info icon={MapPin} text={[cityOf(task), task.address || task.location].filter(Boolean).join(" · ")} />
              <Info icon={Users} text={`${task.spots_total} vietų · ${Number(task.available_hours)} val.`} />
            </div>
            {task.latitude != null && task.longitude != null && (
              <LeafletMap lat={Number(task.latitude)} lng={Number(task.longitude)} height={170} interactive={false} />
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              <button onClick={() => onReserve(task)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground active:scale-95 sm:col-span-3">
                <CalendarCheck className="h-4 w-4" /> Rezervuoti (galėsi pakviesti draugą)
              </button>
              <Link to="/chat" search={{ org: task.organization_id } as any} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-accent sm:col-span-2">
                <MessageCircle className="h-4 w-4" /> Rašyti organizacijai
              </Link>
              <Link to="/org/$id" params={{ id: task.organization_id }} className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-accent">
                Profilis
              </Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ icon: Icon, text }: { icon: typeof Calendar; text: string }) {
  return <p className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-muted-foreground"><Icon className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{text}</span></p>;
}
