const FOREMAN_VOICE_CONTRACT = "meridian.v2g.foremanVoiceTransport.v1";
const ALLOWED_METHODS = "POST";
const MAX_FOREMAN_VOICE_TEXT_LENGTH = 1200;
const ELEVENLABS_TEXT_TO_SPEECH_BASE_URL =
  "https://api.elevenlabs.io/v1/text-to-speech";
const ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_128";
const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";

const JSON_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
});

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

function setResponseHeaders(res, headers) {
  for (const [name, value] of Object.entries(headers)) {
    if (typeof res.setHeader === "function") {
      res.setHeader(name, value);
    }
  }
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  setResponseHeaders(res, {
    ...JSON_HEADERS,
    ...extraHeaders,
  });

  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(payload);
  }

  res.statusCode = statusCode;
  const body = JSON.stringify(payload);

  if (typeof res.end === "function") {
    return res.end(body);
  }

  res.body = body;
  return undefined;
}

function sendAudio(res, audioBuffer) {
  const body = Buffer.isBuffer(audioBuffer)
    ? audioBuffer
    : Buffer.from(audioBuffer);

  setResponseHeaders(res, {
    "Cache-Control": "no-store",
    "Content-Length": String(body.length),
    "Content-Type": "audio/mpeg",
    "X-Foreman-Voice-Contract": FOREMAN_VOICE_CONTRACT,
    "X-Foreman-Voice-Status": "available",
  });

  if (typeof res.status === "function" && typeof res.send === "function") {
    return res.status(200).send(body);
  }

  res.statusCode = 200;

  if (typeof res.end === "function") {
    return res.end(body);
  }

  res.body = body;
  return undefined;
}

async function readRawRequestBody(req) {
  if (typeof req?.[Symbol.asyncIterator] !== "function") {
    return null;
  }

  let raw = "";
  for await (const chunk of req) {
    raw += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
  }

  return raw;
}

function parseRawJson(raw) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, issue: "POST body is required." };
  }

  try {
    const body = JSON.parse(raw);

    if (!isPlainObject(body)) {
      return { ok: false, issue: "POST body must be a JSON object." };
    }

    return { ok: true, body };
  } catch {
    return { ok: false, issue: "POST body must be valid JSON." };
  }
}

async function parseJsonBody(req) {
  if (Object.prototype.hasOwnProperty.call(req, "body")) {
    if (isPlainObject(req.body)) {
      return { ok: true, body: req.body };
    }

    if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
      const raw = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : req.body;

      return parseRawJson(raw);
    }

    return { ok: false, issue: "POST body must be a JSON object." };
  }

  return parseRawJson(await readRawRequestBody(req));
}

function normalizeVoiceText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, MAX_FOREMAN_VOICE_TEXT_LENGTH);
}

function voiceUnavailable(res, issue, statusCode = 503) {
  return sendJson(res, statusCode, {
    contract: FOREMAN_VOICE_CONTRACT,
    error: "voice_unavailable",
    issue,
    ok: false,
  });
}

async function readCompleteAudioBuffer(voiceResponse) {
  const audioArrayBuffer = await voiceResponse.arrayBuffer();

  if (!audioArrayBuffer || audioArrayBuffer.byteLength === 0) {
    return null;
  }

  return Buffer.from(audioArrayBuffer);
}

async function handlePost(req, res) {
  const parsed = await parseJsonBody(req);

  if (!parsed.ok) {
    return sendJson(res, 400, {
      contract: FOREMAN_VOICE_CONTRACT,
      error: "malformed_or_missing_body",
      issue: parsed.issue,
      ok: false,
    });
  }

  const text = normalizeVoiceText(parsed.body.text);

  if (!text) {
    return sendJson(res, 400, {
      contract: FOREMAN_VOICE_CONTRACT,
      error: "invalid_text",
      issue: "text must be a non-empty string.",
      ok: false,
    });
  }

  const apiKey =
    typeof process.env.ELEVENLABS_API_KEY === "string"
      ? process.env.ELEVENLABS_API_KEY.trim()
      : "";
  const voiceId =
    typeof process.env.ELEVENLABS_VOICE_ID === "string"
      ? process.env.ELEVENLABS_VOICE_ID.trim()
      : "";

  if (!apiKey || !voiceId) {
    return voiceUnavailable(
      res,
      "Voice unavailable - showing typed answer."
    );
  }

  if (typeof fetch !== "function") {
    return voiceUnavailable(
      res,
      "Voice transport unavailable - showing typed answer."
    );
  }

  const url =
    `${ELEVENLABS_TEXT_TO_SPEECH_BASE_URL}/${encodeURIComponent(voiceId)}` +
    `?output_format=${ELEVENLABS_OUTPUT_FORMAT}`;

  try {
    const voiceResponse = await fetch(url, {
      body: JSON.stringify({
        model_id: ELEVENLABS_MODEL_ID,
        text,
      }),
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      method: "POST",
    });

    if (!voiceResponse.ok) {
      return voiceUnavailable(
        res,
        "Voice unavailable - showing typed answer.",
        502
      );
    }

    const audioBuffer = await readCompleteAudioBuffer(voiceResponse);

    if (!audioBuffer || audioBuffer.length === 0) {
      return voiceUnavailable(
        res,
        "Voice unavailable - showing typed answer.",
        502
      );
    }

    return sendAudio(res, audioBuffer);
  } catch {
    return voiceUnavailable(
      res,
      "Voice unavailable - showing typed answer.",
      502
    );
  }
}

export default async function handler(req, res) {
  const method = String(req?.method ?? "").toUpperCase();

  if (method !== "POST") {
    return sendJson(
      res,
      405,
      {
        allow: ALLOWED_METHODS,
        contract: FOREMAN_VOICE_CONTRACT,
        error: "method_not_allowed",
        ok: false,
      },
      { Allow: ALLOWED_METHODS }
    );
  }

  return handlePost(req, res);
}
