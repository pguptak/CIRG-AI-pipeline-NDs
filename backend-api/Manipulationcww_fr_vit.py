import numpy as np
from functools import reduce
import operator

def membershipdegree(x, MFs):
    md = [0.0, 0.0, 0.0, 0.0, 0.0]

    for i in range(5):
        if i == 0:
            md[i] = 1.0 - (x/0.25)
        elif i == 4:
            md[i] = (x / 0.25) - 3.0
        else:
            e = MFs[i][0]
            f = MFs[i][1]
            g = MFs[i][2]
            if x < e:
                md[i] = 0.0
            elif x>= e and x<f:
                md[i] = (x-e)/(f-e)
            elif x>= f and x<g:
                md[i] = (g-x)/(g-f)
            else:
                md[i] = 0
    maxmembership = max(md)
    indexmaxmembership = md.index(maxmembership)
    return indexmaxmembership

def manipulationcww_for_vit(conf, words, MFs):

    conf = conf
    words = words
    MFs = MFs

    MFdegree_eye = membershipdegree(conf[0], MFs)
    MFdegree_nose = membershipdegree(conf[1], MFs)
    MFdegree_lips = membershipdegree(conf[2], MFs)

    MF_eye = MFs[MFdegree_eye,:]
    MF_nose = MFs[MFdegree_nose,:]
    MF_lips = MFs[MFdegree_lips,:]

    """print("MF Eyes", MF_eye)
    print("MF Nose", MF_nose)
    print("MF Lips", MF_lips)"""

    #Aggregation of collective preference vector
    lc = (MF_eye[0]+MF_nose[0]+MF_lips[0])/3
    mc = (MF_eye[1]+MF_nose[1]+MF_lips[1])/3
    rc = (MF_eye[2]+MF_nose[2]+MF_lips[2])/3
    return [lc, mc, rc]
