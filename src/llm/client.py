import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

MODEL_NAME = os.getenv("LLM_MODEL", "gpt-4o-mini")


def get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY belum diatur di file .env"
        )

    # Retries are handled explicitly (and bounded) by the caller layers,
    # so disable the SDK's own retry loop to keep a single, testable policy.
    return OpenAI(api_key=api_key, max_retries=0)


def generate_text(prompt: str) -> str:
    response = get_client().responses.create(
        model=MODEL_NAME,
        input=prompt,
        max_output_tokens=800,
    )

    if not response.output_text:
        raise RuntimeError("OpenAI menghasilkan respons kosong.")

    return response.output_text

