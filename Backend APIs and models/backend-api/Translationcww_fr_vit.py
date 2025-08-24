import numpy as np


def translationcww_for_vit(partitions, left, right, words):
    partitions = partitions
    left = left
    right = right
    words = words
    MFs = np.zeros((len(words), 3), dtype=float)
    CentroidsMFs = np.zeros((len(words)), dtype=float)

    # Calculating centroids
    x = (right - left) / (partitions - 1)
    for i in range(partitions):
        CentroidsMFs[i] = left + (i * x)
        if i == 0:
            MFs[i,:] = [left, left, (i+1)*x]
        elif i == partitions-1:
            MFs[i,:] = [(i-1)*x, right, right]
        else:
            MFs[i,:] = [(i-1)*x, i*x, (i+1)*x]

    return MFs, CentroidsMFs