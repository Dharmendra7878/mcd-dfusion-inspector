import re
import os
from typing import Optional

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="MCD-DFusion Multimodal Sentiment & Consistency Inspector")
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS", os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

POSITIVE_WORDS = {
    "good", "great", "awesome", "excellent", "love", "loved", "happy", "joy",
    "success", "best", "amazing", "wonderful", "nice", "win", "yay", "achha",
    "badhiya", "khush", "mast", "accha", "sahi",
}
NEGATIVE_WORDS = {
    "bad", "awful", "terrible", "hate", "sad", "angry", "worst", "failure",
    "fail", "poor", "pain", " दुख", "dukhi", "bura", "bekar", "rona", "ro",
}
POSITIVE_EMOJIS = set("😀😃😄😁😆😊🙂😍🥰😘😎🤗😂🤣😉👍👏🎉❤️❤💖✨😇")
NEGATIVE_EMOJIS = set("😞😔😢😭😡🤬😠👎💔😩😫😤☹🙁😿")
EMBEDDING_DIMENSION = 50


class MemeAnalysisRequest(BaseModel):
    caption: str
    ocr_text: str = ""
    emojis: str = ""
    image_mood: str = "neutral"
    perturb_emojis: Optional[str] = None
    consistency_threshold: float = Field(default=0.55, ge=0.0, le=1.0)


def score_text(text: str) -> float:
    tokens = re.findall(r"[^\W_]+", text.lower(), flags=re.UNICODE)
    if not tokens:
        return 0.0
    positive = sum(token in POSITIVE_WORDS for token in tokens)
    negative = sum(token in NEGATIVE_WORDS for token in tokens)
    return float(np.clip((positive - negative) / max(positive + negative, 1), -1.0, 1.0))


def score_emojis(emojis: str) -> float:
    positive = sum(character in POSITIVE_EMOJIS for character in emojis)
    negative = sum(character in NEGATIVE_EMOJIS for character in emojis)
    total = positive + negative
    if total == 0:
        return 0.0
    return float((positive - negative) / total)


def score_image_mood(mood: str) -> float:
    scores = {"positive": 0.8, "negative": -0.8, "neutral": 0.0}
    return scores[mood.lower()]


def project_polarity(value: float) -> np.ndarray:
    """Map signed polarity to a deterministic point on the shared unit circle."""
    angle = (1.0 - float(np.clip(value, -1.0, 1.0))) * np.pi / 2.0
    vector = np.zeros(EMBEDDING_DIMENSION, dtype=np.float64)
    vector[0] = np.cos(angle)
    vector[1] = np.sin(angle)
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector /= norm
    return vector


def cosine_similarity_mapped(left: np.ndarray, right: np.ndarray) -> float:
    left_norm = np.linalg.norm(left)
    right_norm = np.linalg.norm(right)
    if left_norm == 0 or right_norm == 0:
        return 0.5
    cosine = float(np.dot(left, right) / (left_norm * right_norm))
    return float(np.clip((cosine + 1.0) / 2.0, 0.0, 1.0))


def predict_sentiment(combined_score: float) -> str:
    if combined_score > 0.15:
        return "Positive"
    if combined_score < -0.15:
        return "Negative"
    return "Neutral / Sarcastic"


def analyze_modalities(
    caption: str,
    ocr_text: str,
    emojis: str,
    image_mood: str,
    consistency_threshold: float,
) -> dict:
    t_score = score_text(caption)
    ocr_score = score_text(ocr_text)
    e_score = score_emojis(emojis)
    i_score = score_image_mood(image_mood)

    text_similarity = cosine_similarity_mapped(
        project_polarity(t_score), project_polarity(ocr_score)
    )
    image_similarity = cosine_similarity_mapped(
        project_polarity(e_score), project_polarity(i_score)
    )
    mcd_score = round(0.6 * text_similarity + 0.4 * image_similarity, 4)
    is_conflict = mcd_score < consistency_threshold

    if not is_conflict:
        fusion_mode = "Feature-Level Dynamic Fusion (High Consistency)"
        combined_score = 0.45 * t_score + 0.25 * e_score + 0.30 * i_score
    else:
        fusion_mode = "Decision-Level Fusion (Low Consistency / Conflict Detected)"
        if i_score != 0:
            combined_score = 0.20 * t_score + 0.15 * e_score + 0.65 * i_score
        else:
            combined_score = 0.30 * t_score + 0.20 * e_score

    return {
        "mcd_score": mcd_score,
        "consistency_threshold": consistency_threshold,
        "is_conflict": is_conflict,
        "fusion_mode": fusion_mode,
        "predicted_sentiment": predict_sentiment(combined_score),
        "combined_score": round(float(combined_score), 4),
        "modality_scores": {
            "text": round(t_score, 4),
            "ocr_text": round(ocr_score, 4),
            "emojis": round(e_score, 4),
            "image": round(i_score, 4),
        },
        "similarities": {
            "text_ocr": round(text_similarity, 4),
            "emoji_image": round(image_similarity, 4),
        },
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "mcd-dfusion-ai"}


@app.post("/analyze")
def analyze(request: MemeAnalysisRequest) -> dict:
    mood = request.image_mood.lower()
    if mood not in {"positive", "negative", "neutral"}:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422,
            detail="image_mood must be positive, negative, or neutral",
        )

    result = analyze_modalities(
        request.caption,
        request.ocr_text,
        request.emojis,
        mood,
        request.consistency_threshold,
    )
    perturbation_analysis = None
    if request.perturb_emojis:
        perturbed = analyze_modalities(
            request.caption,
            request.ocr_text,
            request.perturb_emojis,
            mood,
            request.consistency_threshold,
        )
        sentiment_flipped = (
            perturbed["predicted_sentiment"] != result["predicted_sentiment"]
        )
        perturbation_analysis = {
            "perturbed_mcd": perturbed["mcd_score"],
            "mcd_delta": round(perturbed["mcd_score"] - result["mcd_score"], 4),
            "perturbed_sentiment": perturbed["predicted_sentiment"],
            "sentiment_flipped": sentiment_flipped,
            "robust_under_perturbation": not sentiment_flipped,
        }

    result["perturbation_analysis"] = perturbation_analysis
    return result
