"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Council members - list of OpenRouter model identifiers
COUNCIL_MODELS = [
    "openai/gpt-5.1",
    "google/gemini-3-pro-preview",
    "deepseek/deepseek-v3.2",
    "x-ai/grok-4",
]

# Chairman model - synthesizes final response
CHAIRMAN_MODEL = "anthropic/claude-sonnet-4.5"

# Per-model pricing (USD) per 1M tokens.
MODEL_PRICING = {
    "openai/gpt-5.1": {"input_per_million": 1.25, "output_per_million": 10.0},
    "google/gemini-3-pro-preview": {"input_per_million": 2.0, "output_per_million": 12.0},
    "deepseek/deepseek-v3.2": {"input_per_million": 0.25, "output_per_million": 0.38},
    "x-ai/grok-4": {"input_per_million": 3.0, "output_per_million": 15.0},
    "anthropic/claude-sonnet-4.5": {"input_per_million": 3.0, "output_per_million": 15.0},
}

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Data directory for conversation storage
DATA_DIR = "data/conversations"

# Upload directory for attachments
UPLOAD_DIR = "data/uploads"
