import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { randomBytes } from "crypto";
import path from "path";
async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
  if (!session || session.expires < new Date()) return null;
  return session.user;
}
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tripId = req.nextUrl.searchParams.get("tripId");
  if (!tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId: user.id }, include: { receipts: { orderBy: { date: "asc" } } } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!trip.receipts.length) return NextResponse.json({ error: "Keine Belege vorhanden" }, { status: 400 });
  const receipts = trip.receipts;
  const byC = (c: string) => receipts.filter(r => r.category === c).reduce((s, r) => s + r.amount, 0);
  const total = receipts.reduce((s, r) => s + r.amount, 0);
  const fmt = (n: number) => n.toFixed(2).replace(".", ",");
  const fmtDate = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const fmtDateFile = (d: Date) => d.toISOString().split("T")[0];
  const tmpId = randomBytes(8).toString("hex");
  const genPath = process.env.PDF_GENERATOR_PATH || path.join(process.cwd(), "pdf-generator");
  const tmpFiles: string[] = [];
  try {
    let sigPath: string | null = null;
    if (user.signaturePath && existsSync(user.signaturePath)) {
      const isCanvas = user.signaturePath.includes("_canvas");
      if (isCanvas) { sigPath = user.signaturePath; } else {
      sigPath = `/tmp/sig_${tmpId}.png`;
      try { execSync(`python3 ${genPath}/process_signature.py "${user.signaturePath}" "${sigPath}"`, { timeout: 10000 }); tmpFiles.push(sigPath); } catch { sigPath = user.signaturePath; } }
    }
    const rkInput = { profile: { lastName: user.lastName||"", firstName: user.firstName||"", street: user.street||"", zip: user.zipCode||"", city: user.city||"", accountHolder: user.accountHolder||`${user.firstName||""} ${user.lastName||""}`.trim(), bank: user.bank||"", iban: await (async()=>{try{const{decrypt}=await import("@/lib/encryption");return user.ibanEncrypted?decrypt(user.ibanEncrypted):""}catch{return""}})(), bic: user.bic||"", signaturePath: sigPath }, trip: { purpose: trip.purpose, route: (()=>{ if(trip.kmLegs){try{const legs=JSON.parse(trip.kmLegs);if(legs.length>0)return legs.map((l:any)=>l.from).concat(legs[legs.length-1].to).join(" – ")}catch{}} return trip.route||"" })(), startDate: fmtDate(trip.startDate), startTime: trip.startTime||"", endDate: fmtDate(trip.endDate||trip.startDate), endTime: trip.endTime||"", mode: trip.travelMode, pkwReason: trip.pkwReason||"", licensePlate: trip.licensePlate||"", km: trip.travelMode==="PRIVAT_PKW"?Math.round(byC("FAHRT")/0.20):0 }, costs: { travel: fmt(byC("FAHRT")), kmMoney: fmt(trip.travelMode==="PRIVAT_PKW"?byC("FAHRT"):0), lodging: fmt(byC("UNTERKUNFT")), meals: fmt(byC("VERPFLEGUNG")), other: fmt(byC("NEBENKOSTEN")), subtotal: fmt(total), reimbursement: fmt(0), total: fmt(total) }, checkboxes: { bankKnown: true, bahn: trip.travelMode==="BAHN", auto: trip.travelMode==="PRIVAT_PKW", dienstwagen: trip.travelMode==="DIENSTWAGEN"||trip.travelMode==="MIETWAGEN", flugzeug: trip.travelMode==="FLUGZEUG", schiff: false, co2: trip.co2Offset||false } };
    const rkIn=`/tmp/rk_in_${tmpId}.json`,rkOut=`/tmp/rk_out_${tmpId}.pdf`;
    writeFileSync(rkIn,JSON.stringify(rkInput));tmpFiles.push(rkIn,rkOut);
    execSync(`python3 ${genPath}/generate_reisekosten.py ${rkIn} ${rkOut}`,{timeout:30000});
    const handytickets=receipts.filter(r=>r.isHandyticket);
    let htOut: string|null=null;
    if(handytickets.length>0){
      const htInput={name:`${user.firstName||""} ${user.lastName||""}`.trim(),tickets:handytickets.map(r=>({date:fmtDate(r.date),from:r.fromStation||"?",to:r.toStation||"?",amount:r.amount,order_nr:r.description?.match(/#(\d+)/)?.[1]||""})),signature_path:sigPath,notes:trip.notes||""};
      const htIn=`/tmp/ht_in_${tmpId}.json`;htOut=`/tmp/ht_out_${tmpId}.pdf`;
      writeFileSync(htIn,JSON.stringify(htInput));tmpFiles.push(htIn,htOut);
      try{execSync(`python3 ${genPath}/generate_handyticket.py ${htIn} ${htOut}`,{timeout:30000})}catch(e:any){console.error("HT failed:",e.message);htOut=null}
    }
    const mergeFiles:Array<{path:string;label:string}>=[];
    mergeFiles.push({path:rkOut,label:"Reisekostenabrechnung"});
    if(htOut&&existsSync(htOut))mergeFiles.push({path:htOut,label:"Handyticket-Erklärung"});
    for(const receipt of receipts){if(receipt.filePath&&existsSync(receipt.filePath))mergeFiles.push({path:receipt.filePath,label:receipt.description||"Beleg"})}
    const mergeIn=`/tmp/merge_in_${tmpId}.json`,mergeOut=`/tmp/merge_out_${tmpId}.pdf`;
    writeFileSync(mergeIn,JSON.stringify({files:mergeFiles}));tmpFiles.push(mergeIn,mergeOut);
    execSync(`python3 ${genPath}/merge_package.py ${mergeIn} ${mergeOut}`,{timeout:60000});
    const pdf=readFileSync(mergeOut);
    const safePurpose=trip.purpose.replace(/[^a-zA-ZäöüÄÖÜß0-9\s-]/g,"").replace(/\s+/g,"_").substring(0,40);
    const filename=`${fmtDateFile(trip.startDate)}_${safePurpose}_${user.lastName||"Abrechnung"}.pdf`;
    return new NextResponse(pdf,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${filename}"`}});
  }catch(e:any){console.error("PDF error:",e.message);return NextResponse.json({error:"PDF-Generierung fehlgeschlagen: "+e.message},{status:500})}
  finally{for(const f of tmpFiles){try{unlinkSync(f)}catch{}}}
}
