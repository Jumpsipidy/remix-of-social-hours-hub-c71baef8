import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { generateCertificate } from "@/lib/certificates.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

// WinAnsi (StandardFonts) can't encode Lithuanian diacritics — strip them.
function ascii(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

async function buildPdf(cert: Awaited<ReturnType<typeof generateCertificate>>, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const { width, height } = page.getSize();

  // Printer-friendly: no filled color blocks. Only thin dark ink + a single hairline accent.
  const ink = rgb(0.08, 0.09, 0.14);
  const muted = rgb(0.42, 0.44, 0.5);
  const hair = rgb(0.75, 0.77, 0.82);

  const M = 56; // page margin

  // Thin double-line frame (elegant, minimal ink)
  page.drawRectangle({
    x: M - 14, y: M - 14, width: width - 2 * (M - 14), height: height - 2 * (M - 14),
    borderColor: ink, borderWidth: 0.8,
  });
  page.drawRectangle({
    x: M - 10, y: M - 10, width: width - 2 * (M - 10), height: height - 2 * (M - 10),
    borderColor: hair, borderWidth: 0.4,
  });

  // Small eyebrow
  const eyebrow = "SOCIALINES VALANDOS  ·  socialinesvalandos.lt";
  const ew = font.widthOfTextAtSize(eyebrow, 8);
  page.drawText(eyebrow, { x: (width - ew) / 2, y: height - M - 6, size: 8, font, color: muted });

  // Title (editorial serif, centered)
  const title = "Sertifikatas";
  const tSize = 42;
  const tw = serif.widthOfTextAtSize(title, tSize);
  page.drawText(title, { x: (width - tw) / 2, y: height - M - 56, size: tSize, font: serif, color: ink });

  const sub = "apie atliktas socialines valandas";
  const sSize = 12;
  const sw = serifItalic.widthOfTextAtSize(sub, sSize);
  page.drawText(sub, { x: (width - sw) / 2, y: height - M - 78, size: sSize, font: serifItalic, color: muted });

  // Single hairline accent under title
  page.drawLine({
    start: { x: width / 2 - 40, y: height - M - 96 },
    end: { x: width / 2 + 40, y: height - M - 96 },
    thickness: 0.8, color: ink,
  });

  // Preamble
  const preamble = "Sis dokumentas patvirtina, kad";
  const pw = font.widthOfTextAtSize(preamble, 10);
  page.drawText(preamble, { x: (width - pw) / 2, y: height - M - 128, size: 10, font, color: muted });

  // Student name (large centered)
  const name = cert.student_name || "-";
  const nSize = 26;
  const nw = serifBold.widthOfTextAtSize(name, nSize);
  page.drawText(name, { x: (width - nw) / 2, y: height - M - 160, size: nSize, font: serifBold, color: ink });

  // Class + school line
  const meta = [cert.student_class, cert.school_name].filter(Boolean).join("  ·  ") || "";
  if (meta) {
    const mw = font.widthOfTextAtSize(meta, 10);
    page.drawText(meta, { x: (width - mw) / 2, y: height - M - 180, size: 10, font, color: muted });
  }

  // Body statement
  const stmt1 = `atliko ${cert.total_hours} val. socialines veiklos`;
  const stmt2 = `is reikalaujamu ${cert.hours_needed} val.`;
  const s1w = font.widthOfTextAtSize(stmt1, 12);
  const s2w = font.widthOfTextAtSize(stmt2, 11);
  page.drawText(stmt1, { x: (width - s1w) / 2, y: height - M - 214, size: 12, font, color: ink });
  page.drawText(stmt2, { x: (width - s2w) / 2, y: height - M - 232, size: 11, font, color: muted });

  // Reservations table (thin hairline, no fills)
  const tableTop = height - M - 274;
  page.drawText("REZERVACIJU ISKLOTINE", { x: M, y: tableTop, size: 8, font: bold, color: ink });
  page.drawLine({ start: { x: M, y: tableTop - 6 }, end: { x: width - M, y: tableTop - 6 }, thickness: 0.6, color: ink });

  // Column headers
  const colDate = M;
  const colHours = M + 90;
  const colOrg = M + 150;
  let y = tableTop - 22;
  page.drawText("Data", { x: colDate, y, size: 8, font: bold, color: muted });
  page.drawText("Val.", { x: colHours, y, size: 8, font: bold, color: muted });
  page.drawText("Organizacija", { x: colOrg, y, size: 8, font: bold, color: muted });
  y -= 6;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.3, color: hair });
  y -= 12;

  const rows = cert.reservations.slice(0, 18);
  for (const r of rows) {
    if (y < 260) break;
    page.drawText(String(r.date ?? ""), { x: colDate, y, size: 9, font, color: ink });
    page.drawText(String(r.hours ?? ""), { x: colHours, y, size: 9, font, color: ink });
    page.drawText((r.organization || "").slice(0, 62), { x: colOrg, y, size: 9, font, color: ink });
    y -= 14;
  }
  if (cert.reservations.length > rows.length) {
    page.drawText(`... ir dar ${cert.reservations.length - rows.length}`, {
      x: colDate, y, size: 8, font: serifItalic, color: muted,
    });
    y -= 14;
  }
  page.drawLine({ start: { x: M, y: y + 4 }, end: { x: width - M, y: y + 4 }, thickness: 0.6, color: ink });

  // === Verification footer ===
  // QR block (right)
  const qrPngDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 240, color: { dark: "#111827", light: "#ffffff" } });
  const qrBytes = Uint8Array.from(atob(qrPngDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
  const qrImg = await pdf.embedPng(qrBytes);
  const qrSize = 96;
  const qrX = width - M - qrSize;
  const qrY = M + 8;
  page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  page.drawText("Nuskaityk QR", { x: qrX, y: qrY - 12, size: 8, font, color: muted });

  // Signature block (left)
  const sigTop = M + qrSize + 4;
  page.drawLine({ start: { x: M, y: sigTop }, end: { x: qrX - 16, y: sigTop }, thickness: 0.4, color: hair });
  page.drawText("ELEKTRONINIS PARASAS  ·  eIDAS Nr. 910/2014", {
    x: M, y: sigTop - 12, size: 8, font: bold, color: ink,
  });
  page.drawText("Sis dokumentas pasirasytas elektroniskai ir verifikuojamas realiu laiku.", {
    x: M, y: sigTop - 26, size: 8, font, color: muted,
  });
  page.drawText(`Verifikacijos kodas:  ${cert.code}`, {
    x: M, y: sigTop - 42, size: 10, font: bold, color: ink,
  });
  page.drawText(`SHA-256  ${cert.content_hash.slice(0, 40)}...`, {
    x: M, y: sigTop - 56, size: 7, font, color: muted,
  });
  page.drawText(`HMAC     ${cert.signature.slice(0, 40)}...`, {
    x: M, y: sigTop - 68, size: 7, font, color: muted,
  });
  page.drawText(verifyUrl, {
    x: M, y: sigTop - 84, size: 8, font: bold, color: ink,
  });
  page.drawText(`Isduota: ${new Date(cert.generated_at).toLocaleString("lt-LT")}`, {
    x: M, y: sigTop - 96, size: 7, font, color: muted,
  });

  return await pdf.save();
}


export function CertificateButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState<{ earned: number; needed: number } | null>(null);
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const gen = useServerFn(generateCertificate);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("hours_earned, hours_needed")
        .eq("id", user.id)
        .maybeSingle();
      if (alive && data) {
        setHours({
          earned: Number(data.hours_earned ?? 0),
          needed: Number(data.hours_needed ?? 0),
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const goalReached = !!hours && hours.needed > 0 && hours.earned >= hours.needed;
  const canGenerate = goalReached || isAdmin;

  async function generate(mode: "real" | "debug" | "fake") {
    if (busy) return;
    setBusy(true);
    try {
      const cert = await gen({
        data: { debug: mode === "debug", fake: mode === "fake" },
      });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "https://socialinesvalandos.lt";
      const verifyUrl = `${origin}/verify/${cert.code}`;
      const bytes = await buildPdf(cert, verifyUrl);
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SocialinesValandos-${cert.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const msgMap = {
        real: `Sertifikatas sugeneruotas! Kodas: ${cert.code}`,
        debug: `DEBUG sertifikatas sugeneruotas (neįrašomas į DB). Kodas: ${cert.code}`,
        fake: `FAKE demo sertifikatas su išgalvotais duomenimis. Kodas: ${cert.code}`,
      } as const;
      toast.success(msgMap[mode]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Nepavyko: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  const baseCls =
    className ??
    "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:brightness-110 disabled:opacity-60";

  if (!canGenerate) {
    const label = hours
      ? `🔒 PDF sertifikatas (${hours.earned}/${hours.needed} val.)`
      : "🔒 PDF sertifikatas";
    return (
      <button
        type="button"
        disabled
        title="Sertifikatas bus prieinamas pasiekus valandų tikslą"
        className={baseCls + " cursor-not-allowed grayscale"}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => generate("real")} disabled={busy} className={baseCls}>
        {busy ? "Generuojama..." : "📄 Atsisiųsti PDF sertifikatą"}
      </button>
      {isAdmin && (
        <>
          <button
            onClick={() => generate("debug")}
            disabled={busy}
            title="Debug: sugeneruoja PDF su TAVO paskyros duomenimis, nepaisant valandų"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-60"
          >
            🧪 Debug PDF
          </button>
          <button
            onClick={() => generate("fake")}
            disabled={busy}
            title="Fake: sugeneruoja PDF su išgalvotu moksleiviu (Jonas Petraitis, 11B, ~20 val.) — matai kaip atrodo pilnas sertifikatas"
            className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/60 bg-fuchsia-500/10 px-4 py-2.5 text-sm font-semibold text-fuchsia-300 hover:bg-fuchsia-500/20 disabled:opacity-60"
          >
            🎭 Fake Demo PDF
          </button>
        </>
      )}
    </div>
  );
}
