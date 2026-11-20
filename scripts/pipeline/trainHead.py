import json
import sys
from collections import Counter
from datetime import datetime, timezone

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score


def layer_of(x, y, w):
    labels = sorted(set(y))
    if len(labels) < 2:
        return {"labels": labels, "weights": [], "bias": []}, None
    model = LogisticRegression(C=1.0, class_weight="balanced", max_iter=3000)
    model.fit(x, y, sample_weight=w)
    order = list(model.classes_)
    if len(order) == 2:
        coef = np.vstack([-model.coef_[0] / 2, model.coef_[0] / 2])
        bias = np.array([-model.intercept_[0] / 2, model.intercept_[0] / 2])
    else:
        coef = model.coef_
        bias = model.intercept_
    folds = min(5, min(Counter(y).values()))
    accuracy = None
    if folds >= 2:
        accuracy = float(np.mean(cross_val_score(LogisticRegression(C=1.0, class_weight="balanced", max_iter=3000), x, y, cv=folds)))
    return {"labels": order, "weights": np.round(coef, 6).tolist(), "bias": np.round(bias, 6).tolist()}, accuracy


def train(data):
    rows = data["rows"]
    features = data["features"]
    x = np.array([r["x"] for r in rows], dtype=np.float64)
    width = x.shape[1] - len(features)
    scale = np.maximum(np.abs(x[:, width:]).max(axis=0), 1.0)
    x[:, width:] = x[:, width:] / scale
    w = np.array([r["weight"] for r in rows], dtype=np.float64)
    who, who_accuracy = layer_of(x, [r["who"] for r in rows], w)
    staged = [i for i, r in enumerate(rows) if r.get("where")]
    if staged:
        where, where_accuracy = layer_of(x[staged], [rows[i]["where"] for i in staged], w[staged])
    else:
        where, where_accuracy = {"labels": [], "weights": [], "bias": []}, None
    counts = {"rows": len(rows), "owner": sum(1 for r in rows if r["source"] == "owner"), "teacher": sum(1 for r in rows if r["source"] == "teacher"), "staged": len(staged)}
    for label, n in Counter(r["who"] for r in rows).items():
        counts[f"who.{label}"] = n
    if who_accuracy is not None:
        counts["whoCrossValPercent"] = round(who_accuracy * 100)
    if where_accuracy is not None:
        counts["whereCrossValPercent"] = round(where_accuracy * 100)
    return {
        "model": data["model"],
        "features": features,
        "featureScale": np.round(scale, 6).tolist(),
        "who": who,
        "where": where,
        "trainedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "counts": counts,
        "trainer": "sklearn LogisticRegression on frozen MiniLM vectors plus counting features (SetFit head, body not fine-tuned)",
    }


if __name__ == "__main__":
    sys.stdout.write(json.dumps(train(json.load(sys.stdin))))
