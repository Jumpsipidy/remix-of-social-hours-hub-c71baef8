import { PDFDocument, PDFName, PDFString, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import fontUrl from "@/assets/certificate-sans.woff?url";
import type { CertificateVisit } from "@/lib/certificate-integrity";

type PdfCertificate = { code: string; student_name: string; student_class: string | null; school_name: string | null; total_hours: number; hours_needed: number; generated_at: string; reservations: CertificateVisit[]; content_hash: string; signature: string; debug: boolean };
export async function buildCertificatePdf(cert: PdfCertificate, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const response = await fetch(fontUrl);
  if (!response.ok) throw new Error("Nepavyko įkelti pažymėjimo šrifto. Bandyk dar kartą.");
  const font = await pdf.embedFont(await response.arrayBuffer(), { subset: true });
  const ink = rgb(.08,.09,.14), hair = rgb(.8,.82,.85);
  let page = pdf.addPage([595.28,841.89]); let y = 786;
  const left = 42, right = 553;
  const write = (text: string, x: number, yy: number, size = 10) => page.drawText(text, {x,y:yy,size,font,color:ink});
  const wrap = (text: string, width: number, size = 9) => {
    const lines: string[] = []; let line = "";
    for (const char of text.replace(/[\r\n]/g," ")) {
      if (font.widthOfTextAtSize(line + char,size) > width && line) { lines.push(line); line = ""; }
      line += char;
    }
    if (line) lines.push(line);
    return lines.length ? lines : ["—"];
  };
  write("SOCIALINĖS VALANDOS",left,y,10); y -= 44;
  write(cert.debug ? "Bandomasis pažymėjimas" : "Socialinių valandų pažymėjimas",left,y,23); y -= 35;
  for (const line of wrap(cert.student_name || "—",right-left,18)) { write(line,left,y,18); y -= 25; }
  for (const line of wrap([cert.student_class,cert.school_name].filter(Boolean).join(" · "),right-left,11)) { write(line,left,y,11); y -= 16; }
  y -= 14;write(`Patvirtinta: ${cert.total_hours} val. · Tikslas: ${cert.hours_needed} val.`,left,y,13);y -= 35;
  const header = () => { write("Data / laikas",left,y,9);write("Organizacija / patvirtino",165,y,9);write("Val.",520,y,9);y-=10;page.drawLine({start:{x:left,y},end:{x:right,y},color:hair,thickness:.6});y-=18; };
  header();
  for (const visit of cert.reservations) {
    const lines = [...wrap(visit.organization,335),...wrap(`Patvirtino: ${visit.approved_by || (visit.source === "school" ? "mokykla (asmuo neužfiksuotas)" : "asmuo neužfiksuotas")}`,335,8)];
    if (visit.approved_at) lines.push(`Patvirtinta: ${new Date(visit.approved_at).toLocaleDateString("lt-LT")}`);
    const height = Math.max(42,lines.length*13+20);
    if (y-height < 190) { page=pdf.addPage([595.28,841.89]);y=785;write(`Veiklų tęsinys · ${cert.code}`,left,y,11);y-=30;header(); }
    write(visit.date,left,y,9);write(`${visit.start_time?.slice(0,5) || "—"}–${visit.end_time?.slice(0,5) || "—"}`,left,y-14,8);
    lines.forEach((line,i)=>write(line,165,y-i*13,i===0?9:8));write(String(visit.hours),520,y,10);y-=height;
    page.drawLine({start:{x:left,y:y+6},end:{x:right,y:y+6},color:hair,thickness:.3});
  }
  const qr = await pdf.embedPng(await QRCode.toDataURL(verifyUrl,{width:240,margin:4}));
  const pages=pdf.getPages();
  for (let index=0;index<pages.length;index++) {
    page=pages[index];page.drawImage(qr,{x:453,y:55,width:100,height:100});
    write(cert.debug ? "DEMO — viešai negalioja" : "Autentiškumo patikra · HMAC-SHA256",left,150,9);
    write(`Kodas: ${cert.code}`,left,133,10);
    write("Palygink PDF valandas su patikros puslapiu.",left,117,8);
    const urlLines=wrap(verifyUrl,395,8);
    urlLines.forEach((line,i)=>write(line,left,101-i*11,8));
    write(`SHA-256: ${cert.content_hash.slice(0,40)}…`,left,66,7);
    write(`Išduota: ${new Date(cert.generated_at).toLocaleString("lt-LT")} · ${index+1}/${pages.length}`,left,42,7);
    const annotation=pdf.context.obj({Type:"Annot",Subtype:"Link",Rect:[left,78,440,110],Border:[0,0,0],A:{Type:"Action",S:"URI",URI:PDFString.of(verifyUrl)}});
    page.node.set(PDFName.of("Annots"),pdf.context.obj([pdf.context.register(annotation)]));
  }
  pdf.setTitle(`Socialinių valandų pažymėjimas ${cert.code}`);
  pdf.setSubject("HMAC patvirtintas veiklų įrašas; PDF kopiją palyginkite su vieša patikra.");
  return pdf.save();
}