import io
import logging
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from TTS.api import TTS

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("doori-tts")
app = FastAPI(title="Doori self-hosted TTS", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://doori-messenger.de", "https://www.doori-messenger.de", "http://localhost:3000", "http://localhost:3001"],
    allow_methods=["POST"],
    allow_headers=["content-type"],
)

VOICE_DIR = Path(os.environ.get("DOORI_VOICE_DIR", "/voices"))
MODELS = {
    "xtts-v2": "tts_models/multilingual/multi-dataset/xtts_v2",
    "parsvoice-xtts": "MohammadJRanjbar/parsvoice-xtts-v2",
}
LANGUAGES = {"de", "en", "tr", "ar", "fa"}
loaded = {}


class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    language: str
    gender: str
    model: str


def get_model(name: str):
    if name not in MODELS:
        raise HTTPException(400, "Unsupported model")
    if name not in loaded:
        try:
            loaded[name] = TTS(MODELS[name], gpu=os.environ.get("DOORI_TTS_GPU", "1") == "1")
        except Exception as exc:
            log.exception("TTS model initialization failed: %s", name)
            raise HTTPException(503, "TTS model unavailable") from exc
    return loaded[name]


@app.post("/synthesize")
def synthesize(request: SynthesisRequest):
    if request.language not in LANGUAGES or request.gender not in {"female", "male"}:
        raise HTTPException(400, "Unsupported voice selection")
    required_model = "parsvoice-xtts" if request.language == "fa" else "xtts-v2"
    if request.model != required_model:
        raise HTTPException(400, "Wrong model for language")
    voice = VOICE_DIR / f"{request.gender}.wav"
    if not voice.is_file():
        log.error("Missing authorized reference voice: %s", request.gender)
        raise HTTPException(503, "Reference voice unavailable")
    language = "fa" if request.language == "fa" else request.language
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as output:
            output_path = output.name
        get_model(request.model).tts_to_file(
            text=request.text,
            speaker_wav=str(voice),
            language=language,
            file_path=output_path,
            split_sentences=True,
        )
        audio = Path(output_path).read_bytes()
        Path(output_path).unlink(missing_ok=True)
        return Response(io.BytesIO(audio).getvalue(), media_type="audio/wav")
    except HTTPException:
        raise
    except Exception as exc:
        log.exception("TTS synthesis failed for language=%s gender=%s", request.language, request.gender)
        raise HTTPException(503, "TTS synthesis unavailable") from exc
