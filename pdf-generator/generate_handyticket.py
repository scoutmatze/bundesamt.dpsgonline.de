import sys, json, io, os, datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
FP="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
if os.path.exists(FP):pdfmetrics.registerFont(TTFont("DVSans",FP));FONT="DVSans"
else:FONT="Helvetica"
def generate(data,output_path):
    name=data["name"];tickets=data["tickets"];sig=data.get("signature_path")
    today=datetime.date.today().strftime("%d.%m.%Y")
    buf=io.BytesIO();c=canvas.Canvas(buf,pagesize=A4);w,h=A4
    c.setFont(FONT,14);c.drawString(60,h-60,"Erklärung zur Nutzung von Handytickets")
    c.setFont(FONT,10);y=h-100
    txt=f"Hiermit erkläre ich, {name}, dass ich für die nachfolgend aufgeführten Fahrten Handytickets (Online-Tickets) der Deutschen Bahn genutzt habe. Die Tickets wurden auf mein Smartphone geladen und bei der Fahrkartenkontrolle vorgezeigt. Ein Ausdruck der Tickets war nicht erforderlich."
    for line in simpleSplit(txt,FONT,10,w-120):c.drawString(60,y,line);y-=14
    y-=20;c.setFont(FONT,9);c.setFillColor("#5c5850")
    c.drawString(60,y,"DATUM");c.drawString(150,y,"VON");c.drawString(280,y,"NACH");c.drawString(410,y,"BETRAG");c.drawString(470,y,"AUFTRAGSNR.")
    y-=4;c.setStrokeColor("#d4d0c8");c.line(60,y,w-60,y);y-=14
    c.setFillColor("#1a1815");c.setFont(FONT,10);total=0
    for t in tickets:
        c.drawString(60,y,t.get("date",""));c.drawString(150,y,t.get("from","?"));c.drawString(280,y,t.get("to","?"))
        amt=t.get("amount",0);total+=amt;c.drawRightString(450,y,f"{amt:.2f} €".replace(".",","));c.drawString(470,y,t.get("order_nr",""));y-=16
    y-=4;c.line(60,y,w-60,y);y-=16;c.drawString(60,y,"Gesamt:");c.drawRightString(450,y,f"{total:.2f} €".replace(".",","))
    y-=60;c.drawString(60,y,today);c.line(300,y-2,500,y-2);c.setFont(FONT,8);c.drawString(300,y-14,name)
    if sig and os.path.exists(sig):
        try:
            from PIL import Image;si=Image.open(sig);sr=si.height/si.width;sw,sh=80,80*sr
            c.drawImage(ImageReader(sig),360,y-2-(sh*0.15),width=sw,height=sh,mask='auto')
        except:pass
    c.save();buf.seek(0)
    with open(output_path,"wb") as f:f.write(buf.getvalue())
if __name__=="__main__":
    with open(sys.argv[1]) as f:data=json.load(f)
    generate(data,sys.argv[2])
