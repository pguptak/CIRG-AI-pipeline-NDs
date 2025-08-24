import math
import numpy as np


def EucledianSimilarity(words, YLWA, MFs):
    words = words
    YLWA = YLWA
    MFs = MFs

    S = np.zeros((len(words)), dtype=float)
    for i in range(len(words)):
        S[i] = math.sqrt((0.2*pow((YLWA[0]-MFs[i][0]),2))+(0.6*pow((YLWA[1]-MFs[i][1]),2))+(0.2*pow((YLWA[2]-MFs[i][2]),2)))

    indices = list()
    for i in range(len(S)):
        if S[i] == S.min():
            indices.append(i)

    decode = list()
    for ele in indices:
        decode.append(words[ele])

    return S, indices, decode