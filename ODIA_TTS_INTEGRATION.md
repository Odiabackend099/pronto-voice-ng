# ODIA TTS Integration - Complete Migration from ElevenLabs

## ✅ Successfully Implemented

### 1. Core TTS Client & Hook
- **Created**: `src/utils/ttsClient.ts` - Main client for ODIA TTS service
- **Created**: `src/hooks/useTTS.ts` - React hook with audio management
- **Features**: 
  - Direct integration with https://odia-tts.onrender.com
  - Nigerian voice support (English, Yoruba, Igbo, Hausa)
  - Audio memory management (blob cleanup)
  - Error handling with fallbacks

### 2. Component Updates
- **Updated**: `src/components/TTSTestComponent.tsx`
  - Now uses ODIA TTS instead of ElevenLabs
  - Voice selection dropdown with Nigerian voices
  - Real-time testing interface
  - Performance metrics display

- **Updated**: `src/components/VoiceRecorder.tsx`
  - Emergency responses now use ODIA TTS
  - Direct API calls to your service
  - Audio blob management
  - Fallback to browser speech synthesis

### 3. Edge Function Migration
- **Updated**: `supabase/functions/tts-generate/index.ts`
  - Now proxies to ODIA TTS service
  - Voice mapping from ElevenLabs IDs to Nigerian voices
  - Maintains backward compatibility
  - Error handling and CORS support

### 4. Dependency Cleanup
- **Removed**: `@11labs/react` package
- **No new dependencies required** - uses native fetch API

## 🎯 Integration Points

### Voice Agent Response Flow:
1. **Emergency Detection** → STT transcription
2. **Classification** → Emergency type/severity
3. **TTS Generation** → ODIA TTS with Nigerian voices
4. **Audio Playback** → Native Audio API with cleanup

### Supported Nigerian Voices:
- `en-NG-EzinneNeural` - Nigerian English Female (Default)
- `en-NG-AbeoNeural` - Nigerian English Male
- `yo-NG-AdunniNeural` - Yoruba Female
- `ig-NG-EbelechukwuNeural` - Igbo Female
- `ha-NG-SalmaNeural` - Hausa Female

## 🔧 Usage Examples

### Basic TTS (React Hook):
```typescript
import { useTTS } from '@/hooks/useTTS';

const { play, stop, isLoading, isPlaying } = useTTS();

// Play emergency response
await play("Emergency services are on the way", "en-NG-EzinneNeural");
```

### Direct Client Usage:
```typescript
import { speak } from '@/utils/ttsClient';

const { objectUrl } = await speak({
  text: "Help is coming",
  voice: "en-NG-EzinneNeural",
  rate: "+0%",
  volume: "+0%"
});
```

## 🌐 API Endpoints

### ODIA TTS Service:
- **Base URL**: `https://odia-tts.onrender.com`
- **Endpoint**: `GET /speak?text=...&voice=...&rate=...&volume=...`
- **Response**: `audio/mpeg` (MP3 format)

### Edge Function:
- **URL**: `[SUPABASE_URL]/functions/v1/tts-generate`
- **Method**: `POST`
- **Body**: `{ text, voice_id, voice }`
- **Response**: `{ audio_url, provider: "odia-tts", voice_used, duration_ms }`

## 🚀 Production Requirements

### Service Dependencies:
1. **ODIA TTS Service** must be running at `https://odia-tts.onrender.com`
2. **CORS enabled** for your domain
3. **Service uptime** - Consider monitoring/alerting

### Performance Considerations:
- Audio blobs are cleaned up automatically
- No API keys required (public service)
- Latency depends on ODIA service response time
- Fallback to browser speech synthesis if service fails

### Error Handling:
- Network failures → Browser speech synthesis
- Invalid voices → Defaults to `en-NG-EzinneNeural`
- Service unavailable → Graceful degradation

## 🔒 Security Benefits

### Removed Attack Vectors:
- No ElevenLabs API keys in environment
- No external API key management
- Direct service-to-service communication
- Reduced third-party dependencies

### Current Security:
- Public TTS service (no authentication needed)
- CORS-enabled for web browser access
- No sensitive data transmission

## 📊 Testing Status

### ✅ Working Components:
- TTSTestComponent with voice selection
- VoiceRecorder emergency responses
- Edge function proxy
- useTTS hook with audio management

### 🧪 Test Scenarios:
1. **Emergency Call Flow**: Voice → STT → Classification → ODIA TTS → Audio
2. **Voice Selection**: Multiple Nigerian languages/voices
3. **Error Handling**: Service unavailable, network issues
4. **Performance**: Response time, audio quality

## 🔄 Migration Complete

The system has been successfully migrated from ElevenLabs to your ODIA TTS service. All voice agent responses now use Nigerian voices, providing a more culturally appropriate emergency response system for Nigerian users.

### Key Benefits:
- **Cost**: No more API usage fees
- **Localization**: Native Nigerian language support
- **Control**: Your own TTS infrastructure
- **Reliability**: No third-party API dependencies