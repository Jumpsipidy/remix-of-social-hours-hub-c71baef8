import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { generateCertificate } from "@/lib/certificates.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

async function buildPdf(cert: Awaited<ReturnType<typeof generateCertificate>>, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const primary = rgb(0.11, 0.35, 0.87);
  const ink = rgb(0.08, 0.09, 0.14);
  const muted = rgb(0.4, 0.42, 0.5);

  // Header band
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: primary });
  page.drawText("SOCIALINIU VALANDU SERTIFIKATAS", {
    x: 40, y: height - 45, size: 18, font: bold, color: rgb(1, 1, 1),
  });
  page.drawText("socialinesvalandos.lt", {
    x: 40, y: height - 70, size: 11, font, color: rgb(0.85, 0.9, 1),
  });

  let y = height - 130;
  const line = (label: string, value: string, size = 11) => {
    page.drawText(label, { x: 40, y, size: 9, font, color: muted });
    page.drawText(value, { x: 40, y: y - 14, size, font: bold, color: ink });
    y -= 34;
  };

  line("MOKSLEIVIS", cert.student_name || "-", 14);
  line("KLASE", cert.student_class || "-");
  line("MOKYKLA", cert.school_name || "-");
  line("BENDRAS VALANDU SKAICIUS", `${cert.total_hours} val. (reikia ${cert.hours_needed})`, 14);
  line("ISDUOTA", new Date(cert.generated_at).toLocaleString("lt-LT"));

  // Reservations table
  y -= 4;
  page.drawText("REZERVACIJU ISKLOTINE", { x: 40, y, size: 10, font: bold, color: primary });
  y -= 16;
  page.drawText("Data       Val.  Organizacija", { x: 40, y, size: 9, font, color: muted });
  y -= 12;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: muted });
  y -= 12;
  for (const r of cert.reservations.slice(0, 22)) {
    const row = `${r.date}   ${String(r.hours).padStart(4)}   ${(r.organization || "").slice(0, 55)}`;
    page.drawText(row, { x: 40, y, size: 9, font, color: ink });
    y -= 12;
    if (y < 220) break;
  }

  // QR code
  const qrPngDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 220 });
  const qrBytes = Uint8Array.from(atob(qrPngDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
  const qrImg = await pdf.embedPng(qrBytes);
  const qrSize = 120;
  page.drawImage(qrImg, { x: width - 40 - qrSize, y: 60, width: qrSize, height: qrSize });

  // Signature block
  page.drawLine({ start: { x: 40, y: 190 }, end: { x: width - 40, y: 190 }, thickness: 0.5, color: muted });
  page.drawText("ELEKTRONINIS PARASAS / ELECTRONIC SIGNATURE", {
    x: 40, y: 175, size: 9, font: bold, color: primary,
  });
  page.drawText("Sis dokumentas pasirasytas elektroniskai ir verifikuojamas realiu laiku.", {
    x: 40, y: 160, size: 9, font, color: ink,
  });
  page.drawText(`Verifikacijos kodas: ${cert.code}`, { x: 40, y: 145, size: 9, font: bold, color: ink });
  page.drawText(`SHA-256: ${cert.content_hash.slice(0, 48)}...`, { x: 40, y: 132, size: 8, font, color: muted });
  page.drawText(`HMAC: ${cert.signature.slice(0, 48)}...`, { x: 40, y: 120, size: 8, font, color: muted });
  page.drawText("Pagal eIDAS Nr. 910/2014 elektroninis parasas turi teisine galia.", {
    x: 40, y: 105, size: 8, font, color: muted,
  });
  page.drawText("Nuskaityk QR arba iveskite koda:", { x: 40, y: 85, size: 9, font, color: ink });
  page.drawText(verifyUrl, { x: 40, y: 72, size: 9, font: bold, color: primary });

  return await pdf.save();
}

export function CertificateButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const gen = useServerFn(generateCertificate);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const cert = await gen({ data: undefined as never });
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
      toast.success(`Sertifikatas sugeneruotas! Kodas: ${cert.code}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Nepavyko: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:brightness-110 disabled:opacity-60"
      }
    >
      {busy ? "Generuojama..." : "📄 Atsisiusti PDF sertifikata"}
    </button>
  );
}
