import argparse
import json
import sys


def fallback(audio_path: str, model: str) -> None:
    print(
        json.dumps(
            {
                "transcript": f"Fallback transcript for {audio_path}. Install faster-whisper for better quality.",
                "model": f"fallback-{model}",
            },
            ensure_ascii=False,
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model", default="small")
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel

        whisper_model = WhisperModel(args.model, compute_type="int8")
        segments, _ = whisper_model.transcribe(args.audio, beam_size=3, vad_filter=True)
        text = " ".join(segment.text.strip() for segment in segments if segment.text).strip()
        if not text:
            text = f"No speech detected in {args.audio}."
        print(json.dumps({"transcript": text, "model": f"faster-whisper-{args.model}"}, ensure_ascii=False))
        return 0
    except Exception:
        fallback(args.audio, args.model)
        return 0


if __name__ == "__main__":
    sys.exit(main())
