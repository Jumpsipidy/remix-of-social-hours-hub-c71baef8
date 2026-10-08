import { readFile } from "node:fs/promises";
import { afterEach, expect, it, vi } from "vitest";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { buildCertificatePdf } from "@/lib/certificate-pdf";

afterEach(() => vi.unstubAllGlobals());
it("exports 45 activities across pages with a real clickable verification URI on every page", async () => {
  const font = await readFile("src/assets/certificate-sans.woff");
  vi.stubGlobal("fetch", async () => ({ ok: true, arrayBuffer: async () => font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) }));
  const url = "https://example.org/verify/SV-TEST-TEST-TEST";
  const bytes = await buildCertificatePdf({code:"SV-TEST-TEST-TEST",student_name:"Živilė Ąžuolaitė",student_class:"5B",school_name:"Šeduvos gimnazija",total_hours:180,hours_needed:20,generated_at:"2026-10-08T16:00:00Z",content_hash:"test",signature:"test",debug:true,reservations:Array.from({length:45},(_,i)=>({date:"2026-10-08",hours:4,organization:`Biblioteka ${i+1}`,approved_by:"Auklėtoja Živilė"}))},url);
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThan(1);
  for (const page of pdf.getPages()) {
    const annotations = page.node.Annots();
    const annotation = annotations?.lookup(0);
    expect(annotation?.toString()).toContain("/Subtype /Link");
    const dictionary = pdf.context.lookup(annotations?.get(0));
    if (!dictionary || !("get" in dictionary)) throw new Error("Missing link dictionary");
    const action = pdf.context.lookup(dictionary.get(PDFName.of("A")));
    if (!action || !("get" in action)) throw new Error("Missing link action");
    const uri = action.get(PDFName.of("URI"));
    expect(uri).toBeInstanceOf(PDFString);
    expect((uri as PDFString).decodeText()).toBe(url);
  }
});