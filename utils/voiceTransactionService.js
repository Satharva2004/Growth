import { Audio } from 'expo-av';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Module-level singleton — ensures only one Recording ever exists at a time
let _activeRecording = null;

const RECORDING_OPTIONS = {
    android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
    },
    ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.MEDIUM,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
    },
    web: {},
};

/* ─── Permissions ────────────────────────────────────────────────────────── */

export async function requestMicPermission() {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
}

/* ─── Recording ─────────────────────────────────────────────────────────── */

/**
 * Safely tear down any existing recording object before starting a new one.
 * Prevents "Only one Recording object can be prepared at a given time."
 */
async function _clearStaleRecording() {
    if (!_activeRecording) return;
    try {
        const status = await _activeRecording.getStatusAsync();
        if (status.isRecording) {
            await _activeRecording.stopAndUnloadAsync();
        } else {
            // Already stopped but not yet unloaded
            await _activeRecording._cleanupForUnloadedRecorder?.();
        }
    } catch (_) {
        // Ignore — it may already be unloaded
    } finally {
        _activeRecording = null;
    }
}

export async function startRecording() {
    // Always clean up before creating a new one
    await _clearStaleRecording();

    await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
    _activeRecording = recording;
    return recording;
}

export async function stopRecording(recording) {
    try {
        await recording.stopAndUnloadAsync();
    } catch (e) {
        console.warn('[Voice] stopAndUnloadAsync warning:', e.message);
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    // Clear the singleton ref
    if (_activeRecording === recording) _activeRecording = null;

    return recording.getURI();
}

/* ─── Whisper transcription ──────────────────────────────────────────────── */

/**
 * Send the audio file to Groq Whisper using FormData + file URI.
 * React Native's fetch stack handles the multipart upload natively —
 * no need to read the file to base64.
 */
export async function transcribeAudio(fileUri) {
    const formData = new FormData();
    formData.append('file', {
        uri: fileUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
    });
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'en');
    formData.append('response_format', 'json');

    const response = await fetch(WHISPER_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: formData,
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Whisper ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.text?.trim() ?? '';
}

/* ─── NLU parse ─────────────────────────────────────────────────────────── */

const NLU_PROMPT = (transcript) => `
You are a personal finance assistant. Extract transaction details from this spoken sentence.
The user is recording cash/manual payments in India (amounts are in ₹ / rupees).

Spoken sentence: "${transcript}"

Rules:
- amount: extract the number. Handle words like "fifty", "hundred", "two thousand", "2k" (k = ×1000).
- name: the merchant, person, or place. Clean, title-cased. No UPI IDs.
- category: one of [Food, Travel, Shopping, Bills, Entertainment, Health, Transfer, Income, Investment, Other]
- type: "debit" (paid/spent/gave) or "credit" (received/got/earned)
- payment_method: default "Cash" unless user says "UPI", "card", "online", "net banking", "wallet"
- note: any extra context ("for lunch", "mom's medicine"). Empty string if none.

Return ONLY valid JSON, no markdown:
{
  "amount": <number>,
  "name": "<string>",
  "category": "<string>",
  "type": "<debit|credit>",
  "payment_method": "<string>",
  "note": "<string>"
}

If you genuinely cannot determine the amount, return: {"error": "unclear"}
`.trim();

export async function parseTranscript(transcript) {
    if (!transcript || transcript.length < 3) return { error: 'too_short' };

    const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
            max_tokens: 150,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: NLU_PROMPT(transcript) }],
        }),
    });

    if (!response.ok) throw new Error(`Parse error ${response.status}`);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { error: 'empty_response' };

    return JSON.parse(content);
}

/* ─── Combined pipeline ──────────────────────────────────────────────────── */

export async function transcribeAndParse(fileUri) {
    const transcript = await transcribeAudio(fileUri);
    const parsed = await parseTranscript(transcript);
    return { transcript, parsed };
}
