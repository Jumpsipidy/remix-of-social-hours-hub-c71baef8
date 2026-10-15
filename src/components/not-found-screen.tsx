import { Link } from "@tanstack/react-router";
import { Compass, Home, Search } from "lucide-react";
import { IncidentScreen } from "@/components/incident-screen";
import { Button } from "@/components/ui/button";

export function NotFoundScreen({ path }: { path?: string }) {
  return <IncidentScreen title="Tokio puslapio nėra" description="Nuoroda gali būti pasenusi arba puslapis perkeltas. Grįžk į pradžią arba rask savanorystės veiklą." code="404" icon={<Compass className="h-8 w-8" strokeWidth={1.5} />}
    details={<div><p className="text-xs text-muted-foreground">Ieškotas adresas</p><p className="mt-2 break-all font-mono text-sm">{path ?? "Puslapis nerastas"}</p></div>}
    actions={<><Button asChild className="min-h-12"><Link to="/"><Home />Į pradžią</Link></Button><Button asChild variant="outline" className="min-h-12"><Link to="/tasks"><Search />Ieškoti veiklų</Link></Button></>}
  />;
}
