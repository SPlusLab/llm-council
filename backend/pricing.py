"""Cost estimation utilities for council runs."""

from math import ceil
from typing import Dict, List, Any


DEFAULT_CHARS_PER_TOKEN = 4.0  # rough heuristic; replace with tokenizer if available
DEFAULT_ASSUMPTIONS = {
    # Token conversion
    "chars_per_token": DEFAULT_CHARS_PER_TOKEN,
    # Minimum tokens to avoid dramatic underestimation on tiny prompts
    "min_stage1_tokens": 512,
    "min_stage2_tokens": 256,
    "min_stage3_tokens": 256,
    # Stage ratios (approximate realistic lengths)
    "stage1_output_ratio": 0.9,   # drafts roughly the size of the prompt
    "stage2_output_ratio": 0.35,  # ranking commentary shorter than prompt
    "stage3_output_ratio": 0.8,   # final answer somewhat shorter than prompt
}


def tokens_from_chars(char_count: int, chars_per_token: float = DEFAULT_CHARS_PER_TOKEN) -> int:
    """Approximate tokens from character count."""
    if char_count <= 0:
        return 0
    return ceil(char_count / max(chars_per_token, 1e-6))


def estimate_model_cost(model_id: str, input_tokens: int, output_tokens: int, pricing: Dict[str, Any]) -> Dict[str, Any]:
    """Compute cost for a single model given token counts."""
    model_pricing = pricing.get(model_id, {}) if pricing else {}
    input_rate = float(model_pricing.get("input_per_million", 0.0) or 0.0)
    output_rate = float(model_pricing.get("output_per_million", 0.0) or 0.0)

    cost_input = (input_tokens / 1_000_000) * input_rate
    cost_output = (output_tokens / 1_000_000) * output_rate

    return {
        "model": model_id,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "input_rate_per_million": input_rate,
        "output_rate_per_million": output_rate,
        "cost_input": cost_input,
        "cost_output": cost_output,
        "cost_total": cost_input + cost_output,
        "pricing_missing": input_rate == 0.0 and output_rate == 0.0,
    }


def estimate_council_cost(
    total_chars: int,
    models: List[str],
    chairman_model: str,
    pricing: Dict[str, Any],
    assumptions: Dict[str, float] | None = None,
) -> Dict[str, Any]:
    """Estimate cost for a full council run using more realistic stage lengths."""
    params = {**DEFAULT_ASSUMPTIONS, **(assumptions or {})}

    # Backward-compat: honor legacy keys if provided
    stage1_output_ratio = params.get("stage1_output_ratio", params.get("stage1_output_multiplier", 0.9))
    stage2_output_ratio = params.get("stage2_output_ratio", params.get("stage2_output_multiplier", 0.35))
    stage3_output_ratio = params.get("stage3_output_ratio", params.get("stage3_output_multiplier", 0.8))

    base_tokens = tokens_from_chars(total_chars, params["chars_per_token"])
    base_tokens = max(base_tokens, params.get("min_stage1_tokens", 0))

    num_models = len(models)

    # Stage 1: each model gets the prompt; outputs ~prompt length
    stage1_input_tokens_per_model = base_tokens
    stage1_output_tokens_per_model = max(
        ceil(base_tokens * stage1_output_ratio),
        int(params.get("min_stage1_tokens", 0) * 0.5),
    )
    stage1_total_output_tokens = stage1_output_tokens_per_model * num_models

    # Stage 2: ranking sees original prompt + all stage1 outputs (anonymized)
    stage2_input_tokens_per_model = max(
        ceil(base_tokens + stage1_total_output_tokens),
        params.get("min_stage2_tokens", 0),
    )
    stage2_output_tokens_per_model = max(
        ceil(base_tokens * stage2_output_ratio),
        params.get("min_stage2_tokens", 0),
    )
    stage2_total_output_tokens = stage2_output_tokens_per_model * num_models

    # Stage 3: chairman sees prompt + all stage1 outputs + stage2 rankings
    stage3_input_tokens = max(
        ceil(base_tokens + stage1_total_output_tokens + stage2_total_output_tokens),
        params.get("min_stage3_tokens", 0),
    )
    stage3_output_tokens = max(
        ceil(base_tokens * stage3_output_ratio),
        params.get("min_stage3_tokens", 0),
    )

    stage1_estimates = [
        estimate_model_cost(m, stage1_input_tokens_per_model, stage1_output_tokens_per_model, pricing)
        for m in models
    ]
    stage2_estimates = [
        estimate_model_cost(m, stage2_input_tokens_per_model, stage2_output_tokens_per_model, pricing)
        for m in models
    ]
    chairman_estimate = estimate_model_cost(
        chairman_model, stage3_input_tokens, stage3_output_tokens, pricing
    )

    stage1_total = sum(item["cost_total"] for item in stage1_estimates)
    stage2_total = sum(item["cost_total"] for item in stage2_estimates)
    stage3_total = chairman_estimate["cost_total"]

    return {
        "char_count": total_chars,
        "base_tokens": base_tokens,
        "assumptions": {
            **params,
            "stage1_output_ratio": stage1_output_ratio,
            "stage2_output_ratio": stage2_output_ratio,
            "stage3_output_ratio": stage3_output_ratio,
            "stage1_input_tokens_per_model": stage1_input_tokens_per_model,
            "stage1_output_tokens_per_model": stage1_output_tokens_per_model,
            "stage2_input_tokens_per_model": stage2_input_tokens_per_model,
            "stage2_output_tokens_per_model": stage2_output_tokens_per_model,
            "stage3_input_tokens": stage3_input_tokens,
            "stage3_output_tokens": stage3_output_tokens,
            "num_models": num_models,
        },
        "stage1": {"per_model": stage1_estimates, "cost_total": stage1_total},
        "stage2": {"per_model": stage2_estimates, "cost_total": stage2_total},
        "stage3": {"chairman": chairman_estimate, "cost_total": stage3_total},
        "cost_total": stage1_total + stage2_total + stage3_total,
    }
