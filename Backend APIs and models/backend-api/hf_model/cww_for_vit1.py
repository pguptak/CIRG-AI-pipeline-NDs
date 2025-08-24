from Utilscww_fr_vit import most_frequent, compute_words_confidence
from Translationcww_fr_vit import translationcww_for_vit
from Manipulationcww_fr_vit import manipulationcww_for_vit
from Retranslationcww_fr_vit import EucledianSimilarity
import numpy as np

def process_labels_confidence(label, conf):
    # To find out the most frequent class label
    max_label = most_frequent(label)

    # Find linguistic term set & confidence of each feature
    words, conf = compute_words_confidence(label, max_label, conf)

    # Translation
    CentroidsMFs = np.zeros((len(words)), dtype=float)
    MFs = np.zeros((len(words), 3), dtype=float)
    MFs, CentroidsMFs = translationcww_for_vit(5, 0, 1, words)

    # Manipulation
    YLWA = manipulationcww_for_vit(conf, words, MFs)
    tempYLWA = np.array(YLWA).reshape((1, 3))

    # Retranslation
    S, indices, decode = EucledianSimilarity(words, YLWA, MFs)

    # Concatenation max label and linguistic term
    autism_dict = {
        "AV": "Very Low",
        "AL": "Low",
        "AM": "Moderate",
        "AH": "High",
        "AE": "Very High"
    }

    non_autism_dict = {
        "NE": "Very High",
        "NH": "High",
        "NM": "Moderate",
        "NL": "Low",
        "NL": "Very Low"
    }

    if max_label == "autistic":
        face_label = "autistic" + " " + autism_dict[decode[0]]
    else:
        face_label = "non-autistic" + " " + non_autism_dict[decode[0]]

    return face_label
