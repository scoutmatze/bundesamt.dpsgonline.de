import sys
from PIL import Image
import numpy as np
def process(i,o):
 img=Image.open(i).convert("RGBA");d=np.array(img);b=d[:,:,0].astype(int)+d[:,:,1].astype(int)+d[:,:,2].astype(int);d[b<120]=[0,0,0,0];d[b>700]=[0,0,0,0];a=d[:,:,3];rows=np.any(a>10,axis=1);cols=np.any(a>10,axis=0)
 if not rows.any():Image.fromarray(d).save(o);return
 r0,r1=np.where(rows)[0][[0,-1]];c0,c1=np.where(cols)[0][[0,-1]];Image.fromarray(d).crop((c0,r0,c1+1,r1+1)).save(o)
if __name__=="__main__":process(sys.argv[1],sys.argv[2])
