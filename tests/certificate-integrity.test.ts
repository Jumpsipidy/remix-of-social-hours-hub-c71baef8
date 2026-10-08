import { describe, expect, it } from "vitest";
import { certificateHash, checkCertificateIntegrity, signCertificateHash, type CertificateSnapshot } from "@/lib/certificate-integrity";
const snapshot: CertificateSnapshot = {code:"SV-TEST-TEST-TEST",student_id:"student",student_name:"Živilė",student_class:"5B",school_id:"school",school_name:"Šeduvos gimnazija",total_hours:4,hours_needed:20,generated_at:"2026-10-08T16:00:00.000Z",reservations:[{date:"2026-10-08",hours:4,organization:"Biblioteka",approved_by:"Auklėtoja",approved_at:"2026-10-08T15:00:00Z",start_time:"12:00",end_time:"16:00",source:"school"}]};
describe("certificate integrity",()=>{
  it("accepts a real HMAC and supports an old signing key",async()=>{
    const hash=await certificateHash(snapshot,2), sig="v2:"+await signCertificateHash("test-key",snapshot.code,hash);
    expect(await checkCertificateIntegrity(snapshot,hash,sig,["new-key","test-key"])).toBe(true);
    expect(await checkCertificateIntegrity(snapshot,hash,sig,[])).toBe(false);
  });
  for (const field of ["total_hours","student_class","school_name","reservations"] as const) it(`rejects altered ${field} even with unchanged stored hash`,async()=>{
    const hash=await certificateHash(snapshot,2), sig="v2:"+await signCertificateHash("test-key",snapshot.code,hash);
    const altered={...snapshot,[field]:field==="reservations"?[{...snapshot.reservations[0],approved_by:"Fake",hours:80}]:field==="total_hours"?80:"Changed"};
    expect(await checkCertificateIntegrity(altered,hash,sig,["test-key"])).toBe(false);
  });
  it("accepts legacy snapshots after JSON object key reordering",async()=>{
    const hash=await certificateHash(snapshot,1),sig=await signCertificateHash("test-key",snapshot.code,hash);
    expect(await checkCertificateIntegrity(snapshot,hash,sig,["test-key"])).toBe(true);
  });
  it("rejects a forged HMAC",async()=>{
    const hash=await certificateHash(snapshot,2);
    expect(await checkCertificateIntegrity(snapshot,hash,"v2:"+"0".repeat(64),["test-key"])).toBe(false);
  });
});