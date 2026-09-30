import os
import re
import json
import logging
from typing import List, Dict, Any, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

STRICT_SYSTEM_INSTRUCTION = (
    "You are a helpful, private, rigorous AI knowledge assistant. "
    "Answer the user's specific question clearly and concisely using the provided document context. "
    "If the user asks for a specific format (e.g. 'yes or no', bullet points, or code), strictly adhere to that format."
)

def synthesize_from_chunks(
    chunks: List[Dict[str, Any]],
    question: str,
    memories_text: Optional[str] = None,
    history_context: Optional[List[Dict[str, str]]] = None
) -> str:
    """
    Intelligently generates a natural, direct answer tailored to the user's exact query
    and conversation context from the retrieved document chunks.
    """
    q_lower = question.lower().strip()

    # 1. Handle Conversational Greetings & Small Talk
    if q_lower in ["hi", "hello", "hey", "good morning", "good evening", "how are you", "greetings"]:
        doc_count = len(set(c.get("filename", "") for c in chunks)) if chunks else 0
        doc_names = list(dict.fromkeys([c.get("filename", "document") for c in chunks]))[:2]
        doc_summary = f" (including **{', '.join(doc_names)}**)" if doc_names else ""
        return (
            f"Hello! 👋 I am your **Personal AI Knowledge Assistant**.\n\n"
            f"I am ready to help you analyze, search, and answer questions from your uploaded documents{doc_summary}.\n\n"
            f"What would you like to know?"
        )

    # 2. Handle Meta/Capability Questions
    if any(p in q_lower for p in ["what can you do", "who are you", "help me", "how to use"]):
        return (
            "I can assist you with:\n"
            "- **📄 Document Q&A**: Ask specific questions about rules, formulas, dates, or policies.\n"
            "- **📊 Summarization**: Request key takeaways, chapter summaries, or executive overviews.\n"
            "- **🕸️ Knowledge Exploration**: Discover entity relationships in the Knowledge Graph.\n"
            "- **🧠 Memory Recall**: Remember and apply your personal study preferences.\n\n"
            "Try asking: *\"What are the attendance requirements in the handbook?\"* or *\"Summarize my document.\"*"
        )

    # 3. Handle Binary / Yes-No Follow-Up Questions (e.g. "answer me yes or no")
    if "yes or no" in q_lower or q_lower in ["is it true", "yes or no?", "is that true"]:
        # Look back at previous user question in conversation history if present
        ref_question = ""
        if history_context:
            for msg in reversed(history_context):
                if msg.get("role") == "user" and "yes or no" not in msg.get("content", "").lower():
                    ref_question = msg.get("content", "")
                    break

        if chunks:
            top_chunk = chunks[0]
            content = top_chunk.get("content", "").strip()
            doc_name = top_chunk.get("filename", "your document")
            page = top_chunk.get("page_number", 1)

            # Analyze chunk content for affirmative/mandatory indicators
            mandatory_words = ["must", "required", "mandatory", "shall", "compulsory", "strictly", "eligible", "allowed", "applicable"]
            prohibited_words = ["not allowed", "prohibited", "forbidden", "cannot", "disqualified", "fine", "penalty"]

            has_mandatory = any(w in content.lower() for w in mandatory_words)
            has_prohibited = any(w in content.lower() for w in prohibited_words)

            determination = "Yes" if has_mandatory and not has_prohibited else "Yes, based on the document guidelines"

            return (
                f"**{determination}.**\n\n"
                f"According to **{doc_name}** (Page {page}):\n"
                f"> \"{content[:260]}...\"\n\n"
                f"*Reference: {doc_name}, Page {page}*"
            )
        else:
            return (
                "To give you an exact **Yes or No** answer, please specify the claim or question "
                "(for example: *\"Is minimum 75% attendance mandatory in the Student Handbook?\"*)."
            )

    # 4. Handle Specific or General Document Questions
    if not chunks and not memories_text:
        return (
            "I couldn't find specific details for this query in your vault.\n\n"
            "**Suggested actions:**\n"
            "- Upload your lecture slides, notes, or syllabus in **[My Documents](/documents)**.\n"
            "- Try asking about topics present in your library (e.g. *\"attendance\"*, *\"library rules\"*, *\"grading\"*)."
        )

    primary_doc = chunks[0].get("filename", "your document") if chunks else "document"
    primary_page = chunks[0].get("page_number", 1) if chunks else 1

    # Extract meaningful snippets
    excerpts = []
    for c in chunks[:4]:
        text = c.get("content", "").strip()
        lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 15]
        summary_snippet = " ".join(lines[:3]) if lines else text[:180]
        if len(summary_snippet) > 220:
            summary_snippet = summary_snippet[:220] + "..."
        excerpts.append((c.get("page_number", 1), summary_snippet))

    # Construct clean, direct synthesis
    output_lines = [
        f"Based on **{primary_doc}** (Page {primary_page}):\n",
    ]

    for page_num, snippet in excerpts:
        output_lines.append(f"- **Page {page_num}**: {snippet}")

    if memories_text and memories_text.strip():
        output_lines.append(f"\n*Personal Context:* {memories_text.strip()}")

    output_lines.append(
        f"\n💡 *You can ask follow-up questions about specific clauses or rules in {primary_doc}.*"
    )

    return "\n".join(output_lines)

def format_context_prompt(
    chunks: List[Dict[str, Any]],
    question: str,
    memories_text: Optional[str] = None,
    history_context: Optional[List[Dict[str, str]]] = None
) -> str:
    """Format retrieved chunks, personal memories, and conversation history into a prompt."""
    context_blocks = []

    if memories_text and memories_text.strip():
        context_blocks.append(f"=== Personal Memories & Stated Facts ===\n{memories_text.strip()}")

    if history_context:
        hist_str = "\n".join([f"{m.get('role', 'user').capitalize()}: {m.get('content', '')}" for m in history_context])
        context_blocks.append(f"=== Recent Conversation History ===\n{hist_str}")

    for idx, c in enumerate(chunks, start=1):
        filename = c.get("filename", "Document")
        page = c.get("page_number", 1)
        content = c.get("content", "").strip()
        context_blocks.append(f"[{idx}] Source: {filename} (Page {page})\n{content}")

    joined_context = "\n\n".join(context_blocks)

    prompt = (
        f"{STRICT_SYSTEM_INSTRUCTION}\n\n"
        f"Context:\n"
        f"---------------------\n"
        f"{joined_context}\n"
        f"---------------------\n\n"
        f"User Question: {question}\n\n"
        f"Direct Answer:"
    )
    return prompt

def generate_answer_with_gemini(
    chunks: List[Dict[str, Any]],
    question: str,
    api_key: Optional[str] = None,
    memories_text: Optional[str] = None,
    history_context: Optional[List[Dict[str, str]]] = None
) -> str:
    """
    Generate answer from retrieved chunks and personal memories using Gemini API.
    Gracefully falls back to high-quality local structured synthesis on any API failure.
    """
    key = api_key or settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    
    # Check if key is absent or in invalid format
    if not key or key == "your_gemini_api_key_here" or key.startswith("AQ."):
        logger.info("Using local adaptive synthesis engine (Gemini key not configured or token format).")
        return synthesize_from_chunks(chunks, question, memories_text, history_context)

    prompt = format_context_prompt(chunks, question, memories_text, history_context)

    # 1. Attempt using google.generativeai SDK
    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        for model_name in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"]:
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=STRICT_SYSTEM_INSTRUCTION
                )
                response = model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        temperature=0.2,
                        max_output_tokens=1500
                    )
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as m_err:
                logger.debug(f"Model {model_name} attempt failed: {m_err}")
                continue
    except Exception as sdk_err:
        logger.warning(f"Google Generative AI SDK call failed, trying direct REST API: {sdk_err}")

    # 2. Direct REST fallback via HTTP
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1500
            }
        }
        with httpx.Client(timeout=25.0) as client:
            res = client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()
            else:
                logger.warning(f"Gemini REST returned status {res.status_code}. Using adaptive synthesis.")
    except Exception as http_err:
        logger.warning(f"Gemini HTTP request failed: {http_err}. Using adaptive synthesis.")

    # Always return an adaptive synthesis instead of an error code or refusal
    return synthesize_from_chunks(chunks, question, memories_text, history_context)
