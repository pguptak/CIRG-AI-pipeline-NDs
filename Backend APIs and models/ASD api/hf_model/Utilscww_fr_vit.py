import pandas as pd
import numpy as np
import random
import matplotlib.pyplot as plt

def most_frequent(nums):
    return max(set(nums), key=nums.count)

def compute_words_confidence(label, max_label, conf):
    if max_label == 'autistic':
        words = ['AV', 'AL', 'AM', 'AH', 'AE']
    else:
        words = ['NE', 'NH', 'NM', 'NL', 'NV']

    if max_label == 'autistic':
        if max_label == label[0]:  # Class of eyes is same as maximal set
            conf[0] = conf[0]
        else: # Class of eyes is different from maximal set
            conf[0] = 1.0 - conf[0]

        if max_label == label[1]:  #Class of nose is same as maximal set
            conf[1] = conf[1]
        else: #Class of nose is different from maximal set
            conf[1] = 1.0 - conf[1]

        if max_label == label[2]:  #Class of lips is same as maximal set
            conf[2] = conf[2]
        else: #Class of lips is different from maximal set
            conf[2] = 1.0 - conf[2]
    else:
        if max_label == label[0]:  # Class of eyes is same as maximal set
            conf[0] = 1.0 - conf[0]
        else:  # Class of eyes is different from maximal set
            conf[0] = conf[0]

        if max_label == label[1]:  # Class of nose is same as maximal set
            conf[1] = 1.0 - conf[1]
        else:  # Class of nose is different from maximal set
            conf[1] = conf[1]

        if max_label == label[2]:  # Class of lips is same as maximal set
            conf[2] = 1.0 - conf[2]
        else:  # Class of lips is different from maximal set
            conf[2] = conf[2]

    return words, conf

def plotMFs(words, MF, fileName):
    fig = plt.figure(random.randint(1, 100))
    plt.rcParams["font.family"] = 'times new roman'
    plt.rcParams["font.weight"] = 'bold'
    plt.rcParams['axes.titlepad'] = 0
    plt.rcParams['axes.titlesize'] = 12
    subPlotSize = findsubPlotGrid(len(words))
    for i in range(len(words)):
        ax = plt.subplot(subPlotSize[1], subPlotSize[0], i + 1)
        xpts = [MF[i, 0], MF[i, 1], MF[i, 1], MF[i, 2]]
        ypts = [0, 1, 1, 0]
        ax.plot(xpts, ypts, linestyle="--", color="blue")
        ax.set(title=words[i])
        ax.set_xticks([0, 0.25, 0.5, 0.75, 1])
        ax.set_yticks([0, 1])

    plt.xticks([0, 0, 0.25, 0.5, 0.75, 1])
    plt.yticks([0, 1])
    plt.axis([0, 1, 0, 1])
    plt.tight_layout(w_pad=0.001, h_pad=0.001)
    plt.show()

    """if fileName.find('.') != -1:
        fileName = fileName + ".png"

    plt.tight_layout()
    plt.savefig(fileName)
    """

def findsubPlotGrid(n):
    tempFaclist = list()
    for i in range(1, int(pow(n, 1 / 2)) + 1):
        if n % i == 0:
            tempFaclist.append([i, n / i])

    tempFaclist = np.array(tempFaclist).astype(int)
    index = np.argmax(np.min(tempFaclist, axis=1))
    return tempFaclist[index]

def xlsread(path):
    dataframe = pd.read_excel(path)
    wordlist = dataframe[dataframe.columns[0]]
    Arr = dataframe[dataframe.columns[1]]
    wordList1 = list()
    Arr1 = list()
    for i in range(0, len(wordlist)):
        wordList1.append(wordlist[i])
    for i in range(0, len(Arr)):
        Arr1.append(Arr[i])
    return Arr1, wordList1
