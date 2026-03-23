# TTS Upgrade: Edge TTS (Free) + Full Audio Player

## Context

The current `TextToSpeech.tsx` uses the browser's Web Speech API — robotic-sounding on most desktops, no real time tracking, and no seeking. The user wants natural Arabic audio with a proper audio player UI (progress bar, time display, scrubbing).

**Solution**: Use the **`msedge-tts`** npm package — a free, no-API-key client for Microsoft Edge's "Read Aloud" service that gives access to the neural voice `ar-SA-ZariyahNeural` (the same voice used in Edge browser). It returns a real MP3 stream → served via a Next.js API route → cached in Cloudinary → HTML5 `<audio>` element handles perfect seeking and time display.

**Why this approach:**

- 100% free, no API key, no account needed
- `ar-SA-ZariyahNeural` = natural, non-robotic Saudi Arabic voice
- Real MP3 output → HTML5 `<audio>` → exact time display + real seek/scrub
- Cloudinary caching (already configured) → instant playback after first load
- Works in all browsers consistently (audio is generated server-side)

---

## Architecture

```
User clicks Play
  → Client POSTs { slug, text, title } to /api/tts
  → Server checks Cloudinary cache (public_id: tts/{slug})
  → Cache HIT  → return { url: cloudinary_url }  (fast)
  → Cache MISS → msedge-tts synthesizes MP3 stream
               → Buffer collected → uploaded to Cloudinary
               → return { url: cloudinary_url }
  → Client sets <audio>.src = url → full native seeking + time display
```

---

## Files to Create / Modify

### 1. NEW: `app/api/tts/route.ts`

**Install first**: `npm install msedge-tts`

Logic:

1. `POST` accepts `{ slug: string, text: string, title?: string }`
2. Validate: non-empty text, max 50,000 chars, `slug` required
3. Check Cloudinary: `cloudinary.api.resource('tts/{slug}', { resource_type: 'video' })`
   - If found → return `{ url: result.secure_url }` immediately
4. Prepare text: extract plain text from HTML (if needed) + prepend title
5. Synthesize via `msedge-tts`:

   ```typescript
   import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

   const tts = new MsEdgeTTS();
   await tts.setMetadata(
     "ar-SA-ZariyahNeural", // female, natural Saudi Arabic
     OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
   );
   const readable = tts.toStream(text);
   // Collect chunks into Buffer
   const chunks: Buffer[] = [];
   for await (const chunk of readable) {
     chunks.push(chunk);
   }
   const audioBuffer = Buffer.concat(chunks);
   ```

6. Upload to Cloudinary (resource_type: 'video', public_id: 'tts/{slug}')
7. Return `{ url: secure_url }`

**Error handling**: If Edge TTS fails (network issue), return 503 with message. Client shows error state.

**Voice alternative**: `ar-SA-HamedNeural` for male voice — could expose as a toggle.

### 2. MODIFIED: `components/public/TextToSpeech.tsx`

Complete rewrite. New interface:

```typescript
interface TextToSpeechProps {
  content: string; // HTML article content
  title?: string;
  slug: string; // Cloudinary cache key
  className?: string;
}
```

State:

- `audioUrl: string | null`
- `isLoading: boolean` — true while fetching from /api/tts
- `isPlaying: boolean`
- `currentTime: number` (seconds)
- `duration: number` (seconds)
- `playbackRate: string` — '0.75' | '1' | '1.25' | '1.5'
- `error: string | null`

Refs:

- `audioRef = useRef<HTMLAudioElement>(null)`

Key logic:

```typescript
// On play click
async function handlePlay() {
  if (!audioUrl) {
    setIsLoading(true);
    const text = title
      ? `${title}. ${extractText(content)}`
      : extractText(content);
    const res = await fetch("/api/tts", {
      method: "POST",
      body: JSON.stringify({ slug, text, title }),
      headers: { "Content-Type": "application/json" },
    });
    const { url } = await res.json();
    setAudioUrl(url);
    setIsLoading(false);
    // audio.src triggers onLoadedMetadata, then play
    audioRef.current!.src = url;
    audioRef.current!.play();
  } else {
    audioRef.current!.play();
  }
  setIsPlaying(true);
}

// Seek
function handleSeek(e: ChangeEvent<HTMLInputElement>) {
  const time = parseFloat(e.target.value);
  audioRef.current!.currentTime = time;
  setCurrentTime(time);
}

// Speed change
function handleRateChange(rate: string) {
  setPlaybackRate(rate);
  if (audioRef.current) audioRef.current.playbackRate = parseFloat(rate);
}
```

`<audio>` element events:

- `onLoadedMetadata` → `setDuration(audio.duration)`
- `onTimeUpdate` → `setCurrentTime(audio.currentTime)`
- `onEnded` → `setIsPlaying(false); setCurrentTime(0)`
- `onPause` → `setIsPlaying(false)`
- `onPlay` → `setIsPlaying(true)`

**UI Layout** (RTL, Arabic labels):

```
Before play (compact):
[ 🔊 استماع للمقال ]

While loading:
[ ⏳ جاري التحضير... ]

Player (expanded):
┌────────────────────────────────────────────────────┐
│ [▶/⏸] [══════════●────────────] 2:34 / 8:12  [■] │
│        سرعة: [1x ▼]                               │
└────────────────────────────────────────────────────┘
```

- Progress bar: `<input type="range" min="0" max={duration} step="0.1" value={currentTime} />`
- Time: `formatTime(currentTime) / formatTime(duration)` — using Arabic digits via `.toLocaleString('ar-EG')`
- Speed dropdown: existing `<Select>` component with voiceOptions
- Stop button: resets currentTime and pauses

Helper:

```typescript
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
```

### 3. MODIFIED: `app/article/[slug]/page.tsx` (line ~517)

Change:

```tsx
// Before
<TextToSpeech content={article.content} title={article.title} />

// After
<TextToSpeech content={article.content} title={article.title} slug={article.slug} />
```

### 4. MODIFIED: `.env.example`

Add comment (no key needed, but document the feature):

```
# Text-to-Speech (uses Microsoft Edge TTS - free, no API key required)
# Optional: TTS voice (default: ar-SA-ZariyahNeural | alt: ar-SA-HamedNeural)
# NEXT_PUBLIC_TTS_VOICE="ar-SA-ZariyahNeural"
```

---

## Cloudinary Audio Caching Notes

- Cloudinary uses `resource_type: "video"` for audio files
- Cache key: `tts/{article-slug}` (e.g., `tts/article-about-politics`)
- One-time generation per article — subsequent plays load instantly from CDN
- Cache invalidation (optional, for when article content changes): call
  `cloudinary.uploader.destroy('tts/{slug}', { resource_type: 'video' })`
  from the article update API route

---

## Verification

1. Run `npm install msedge-tts`
2. Run `npm run dev`
3. Open a published article on the public site
4. Click "استماع للمقال"
5. Verify:
   - Loading indicator appears while audio is generated (~2-5s first time)
   - Audio plays with natural Arabic voice (`ar-SA-ZariyahNeural`) — not robotic
   - Time display shows `0:00 / X:XX` (real duration)
   - Progress bar advances as audio plays
   - Dragging the progress bar seeks to that point correctly
   - Speed change works
   - Second play of same article is instant (Cloudinary cache)
6. Run `npx tsc --noEmit` → 0 errors
7. Run `npm run lint` → 0 errors
8. Run `npm run build` → success

---

## Notes

- `ArticleLazyComponents.tsx` stays unchanged (still lazy-loads `TextToSpeech` with `ssr: false`)
- No Prisma schema changes
- `VoiceInputButton.tsx` (admin speech-to-text) unaffected
- `msedge-tts` uses Microsoft's Edge Read Aloud service — unofficial but stable and widely used
- If Edge TTS is unavailable (rare), API returns 503 and component shows a friendly error message
