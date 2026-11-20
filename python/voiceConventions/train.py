import json
import sys


def fit(payload):
    import numpy as np
    from scipy import sparse
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import GroupKFold

    params = payload["params"]
    texts = payload["texts"]
    labels = np.asarray(payload["labels"], dtype=int)
    groups = np.asarray(payload["groups"], dtype=int)
    weights = np.asarray(payload["weights"], dtype=float)
    embeddings = np.asarray(payload["embeddings"], dtype=float)
    if embeddings.size:
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1
        embeddings = embeddings / norms * float(params["embedScale"])

    def vectorizer():
        return TfidfVectorizer(analyzer="char", ngram_range=(params["ngramMin"], params["ngramMax"]), lowercase=True, sublinear_tf=True, min_df=params["minDf"], max_features=params["maxFeatures"], dtype=np.float64)

    def features(vec, rows, fitting):
        grams = vec.fit_transform([texts[i] for i in rows]) if fitting else vec.transform([texts[i] for i in rows])
        if embeddings.size:
            return sparse.hstack([grams, sparse.csr_matrix(embeddings[rows])]).tocsr()
        return grams.tocsr()

    def model():
        return LogisticRegression(C=params["c"], class_weight="balanced", max_iter=3000, solver="liblinear")

    count = len(texts)
    oof = np.zeros(count)
    folds = np.full(count, -1)
    splits = min(params["folds"], len(set(groups.tolist())))
    every = np.arange(count)
    for k, (train, test) in enumerate(GroupKFold(n_splits=splits).split(every, labels, groups)):
        vec = vectorizer()
        x_train = features(vec, train, True)
        clf = model().fit(x_train, labels[train], sample_weight=weights[train])
        oof[test] = clf.predict_proba(features(vec, test, False))[:, 1]
        folds[test] = k
    vec = vectorizer()
    x_all = features(vec, every, True)
    clf = model().fit(x_all, labels, sample_weight=weights)
    vocab = [None] * len(vec.vocabulary_)
    for gram, at in vec.vocabulary_.items():
        vocab[at] = gram
    coef = clf.coef_[0]
    width = len(vocab)
    return {
        "vocab": vocab,
        "idf": [round(float(v), 6) for v in vec.idf_],
        "gramWeights": [round(float(v), 6) for v in coef[:width]],
        "embedWeights": [round(float(v), 6) for v in coef[width:]],
        "bias": float(clf.intercept_[0]),
        "oof": [round(float(v), 6) for v in oof],
        "fitted": [round(float(v), 6) for v in clf.predict_proba(x_all[: params.get("probe", 0)])[:, 1]] if params.get("probe", 0) else [],
        "folds": [int(v) for v in folds],
    }


def main():
    raw = sys.stdin.buffer.read()
    try:
        import sklearn
    except ImportError:
        sys.stdout.write(json.dumps({"error": "sklearnMissing"}) + "\n")
        return 3
    payload = json.loads(raw.decode("utf-8"))
    sys.stdout.write(json.dumps(fit(payload)) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
