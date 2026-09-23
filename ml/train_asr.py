"""Small, reproducible Kazakh Whisper LoRA experiment on FLEURS.

Run on a GPU host for a useful checkpoint. A held-out validation split is evaluated
before and after training; export to CTranslate2 only when the result improves.
"""

import argparse
from dataclasses import dataclass
from pathlib import Path

from datasets import Dataset, load_dataset
from jiwer import cer, wer
from peft import LoraConfig, TaskType, get_peft_model
from transformers import (
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
    WhisperForConditionalGeneration,
    WhisperProcessor,
)


@dataclass
class SpeechCollator:
    processor: WhisperProcessor

    def __call__(self, rows):
        features = self.processor.feature_extractor.pad(
            [{"input_features": row["input_features"]} for row in rows], return_tensors="pt"
        )
        labels = self.processor.tokenizer.pad(
            [{"input_ids": row["labels"]} for row in rows], return_tensors="pt"
        )
        label_ids = labels["input_ids"].masked_fill(labels.attention_mask.ne(1), -100)
        if (label_ids[:, 0] == self.processor.tokenizer.bos_token_id).all():
            label_ids = label_ids[:, 1:]
        features["labels"] = label_ids
        return features


def load_split(name: str, limit: int, processor: WhisperProcessor) -> Dataset:
    stream = load_dataset("google/fleurs", "kk_kz", split=name, streaming=True)
    examples = []
    for row in stream.take(limit):
        audio = row["audio"]
        if not isinstance(audio, dict) or "array" not in audio:
            raise RuntimeError("FLEURS audio decoding failed; use a compatible datasets version")
        features = processor.feature_extractor(audio["array"], sampling_rate=audio["sampling_rate"])
        labels = processor.tokenizer(row["transcription"]).input_ids
        examples.append({"input_features": features.input_features[0], "labels": labels})
    if not examples:
        raise RuntimeError(f"No examples in FLEURS {name}")
    return Dataset.from_list(examples)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-model", default="openai/whisper-small")
    parser.add_argument("--train-samples", type=int, default=400)
    parser.add_argument("--validation-samples", type=int, default=40)
    parser.add_argument("--steps", type=int, default=100)
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("models") / "whisper-kz-lora")
    args = parser.parse_args()
    if args.train_samples < 1 or args.validation_samples < 1 or args.steps < 1:
        parser.error("sample counts and steps must be positive")

    processor = WhisperProcessor.from_pretrained(args.base_model, language="Kazakh", task="transcribe")
    train_data = load_split("train", args.train_samples, processor)
    validation_data = load_split("validation", args.validation_samples, processor)
    model = WhisperForConditionalGeneration.from_pretrained(args.base_model)
    model.generation_config.language = "kazakh"
    model.generation_config.task = "transcribe"
    model = get_peft_model(model, LoraConfig(
        r=8, lora_alpha=16, lora_dropout=0.05,
        target_modules=["q_proj", "v_proj"], task_type=TaskType.SEQ_2_SEQ_LM,
    ))

    def metrics(prediction):
        labels = prediction.label_ids.copy()
        labels[labels == -100] = processor.tokenizer.pad_token_id
        hypotheses = processor.batch_decode(prediction.predictions, skip_special_tokens=True)
        references = processor.batch_decode(labels, skip_special_tokens=True)
        return {"wer": wer(references, hypotheses), "cer": cer(references, hypotheses)}

    trainer = Seq2SeqTrainer(
        model=model,
        args=Seq2SeqTrainingArguments(
            output_dir=str(args.output),
            per_device_train_batch_size=1,
            gradient_accumulation_steps=4,
            per_device_eval_batch_size=1,
            learning_rate=1e-4,
            max_steps=args.steps,
            eval_strategy="no",
            save_strategy="no",
            predict_with_generate=True,
            generation_max_length=225,
            remove_unused_columns=False,
            report_to="none",
            push_to_hub=False,
            fp16=False,
        ),
        train_dataset=train_data,
        eval_dataset=validation_data,
        data_collator=SpeechCollator(processor),
        compute_metrics=metrics,
        processing_class=processor,
    )
    baseline = trainer.evaluate(metric_key_prefix="baseline")
    trainer.train()
    trained = trainer.evaluate(metric_key_prefix="trained")
    args.output.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(args.output)
    processor.save_pretrained(args.output)
    report = {"base_model": args.base_model, "train_samples": args.train_samples,
              "validation_samples": args.validation_samples, "steps": args.steps,
              "baseline_wer": baseline["baseline_wer"], "baseline_cer": baseline["baseline_cer"],
              "trained_wer": trained["trained_wer"], "trained_cer": trained["trained_cer"]}
    (args.output / "report.json").write_text(__import__("json").dumps(report, ensure_ascii=False, indent=2))
    print(report)


if __name__ == "__main__":
    main()
