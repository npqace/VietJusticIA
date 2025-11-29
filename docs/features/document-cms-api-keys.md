# Document CMS API Key Configuration

**Last Updated**: 2025-11-16

## Overview

The Document CMS service now uses **dedicated API keys exclusively for document uploads**, completely isolated from the main chat service. This prevents document upload operations from consuming the chat service's API quota.

## Key Features

### 1. Dedicated CMS API Keys
- **Required**: `GOOGLE_API_KEY_CMS` or numbered keys (`GOOGLE_API_KEY_CMS_1`, etc.)
- **Isolated**: Does NOT use or fall back to `GOOGLE_API_KEY` (main chat key)
- **Protected**: Main chat service quota is never affected by document uploads

### 2. Multi-Key Support with Automatic Rotation
- Supports multiple API keys for high-volume uploads
- Automatic rotation when quota is exceeded
- No downtime during quota limits

### 3. Gemini Model Selection

**Recommended: `gemini-2.0-flash`** ✅ (Currently configured)

| Model | Pros | Cons | Recommendation |
|-------|------|------|----------------|
| **gemini-2.0-flash** | ✅ Stable (non-exp)<br>✅ Good free tier support<br>✅ Better performance than 1.5<br>✅ Currently working | ⚠️ Less battle-tested than 1.5 | **Currently in use** |
| **gemini-1.5-flash** | ✅ Most stable<br>✅ Proven free tier support<br>✅ Widely tested | ❌ May not be available in all API versions<br>❌ Older model | Alternative if available |
| **gemini-2.5-flash** | ✅ Latest features<br>✅ Best performance | ⚠️ New, less stable<br>⚠️ Quota availability uncertain | Testing/experimental only |
| **gemini-2.0-flash-exp** | ❌ N/A | ❌ Quota "limit: 0" errors | ❌ Do NOT use |

**Current Configuration**: `gemini-2.0-flash` in `document_cms_service.py` line 252

To change the model, edit:
```python
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",  # Change this
    temperature=0.2,
    google_api_key=current_key
)
```

---

## Configuration Options

### Option 1: Single CMS API Key (Simple)

**Best for**: Development, low-volume uploads (< 15 documents/hour)

**.env file:**
```bash
GOOGLE_API_KEY=<your-chat-api-key>
GOOGLE_API_KEY_CMS=<your-cms-api-key>
```

**Behavior**:
- Uses `GOOGLE_API_KEY_CMS` exclusively for document uploads
- No fallback to `GOOGLE_API_KEY`
- Fails if quota exceeded (manual intervention required)

---

### Option 2: Multiple CMS Keys with Rotation (Recommended)

**Best for**: Production, high-volume uploads, 24/7 availability

**.env file:**
```bash
GOOGLE_API_KEY=<your-chat-api-key>

# CMS Keys with automatic rotation
GOOGLE_API_KEY_CMS_1=<first-cms-api-key>
GOOGLE_API_KEY_CMS_2=<second-cms-api-key>
GOOGLE_API_KEY_CMS_3=<third-cms-api-key>
```

**Behavior**:
- Discovers all numbered keys automatically
- Uses keys sequentially: CMS_1 → CMS_2 → CMS_3
- On quota error, rotates to next key immediately
- Fails only when ALL keys exhausted
- Effective quota = (15 RPM × number of keys)

**Example with 3 keys**:
- Effective capacity: 45 uploads/hour (3 × 15)
- Automatic failover on quota errors
- No manual intervention needed

---

## How It Works

### Clean Architecture - No Environment Variable Swapping!

The system passes API keys **directly** to `ChatGoogleGenerativeAI` using the `google_api_key` parameter:

```python
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0.2,
    google_api_key=current_key  # Direct parameter, no env var swap!
)
```

**Benefits**:
- ✅ No manipulation of `GOOGLE_API_KEY` environment variable
- ✅ Chat service completely isolated and unaffected
- ✅ No `finally` blocks needed for cleanup
- ✅ Thread-safe (no shared state modification)
- ✅ Cleaner, more maintainable code

### Key Discovery Process

1. **Checks for numbered keys first**:
   - `GOOGLE_API_KEY_CMS_1`, `GOOGLE_API_KEY_CMS_2`, etc.
   - Stops when key doesn't exist

2. **Falls back to single key**:
   - `GOOGLE_API_KEY_CMS` (if no numbered keys found)

3. **Fails if no CMS keys**:
   - Raises `ValueError: GOOGLE_API_KEY_CMS is required for document uploads`
   - Does NOT fall back to `GOOGLE_API_KEY`

### Quota Error Handling

When a diagram generation request hits quota:

1. **Detects quota error**: `ResourceExhausted`, `429`, or "quota" in error message
2. **Logs warning**: Shows which key exceeded quota
3. **Rotates key**: Switches to next available CMS key
4. **Retries immediately**: No delay between key rotations
5. **Reports exhaustion**: If all keys exhausted, returns clear error message

### Logging Examples

**Startup with multiple keys:**
```
INFO: Discovered 3 CMS API key(s)
INFO:   Key 1: GOOGLE_API_KEY_CMS_1 = AIzaSyDB...MwNw
INFO:   Key 2: GOOGLE_API_KEY_CMS_2 = AIzaSyDM...y1wg
INFO:   Key 3: GOOGLE_API_KEY_CMS_3 = AIzaSyBx...xyz1
```

**During diagram generation:**
```
INFO: Using GOOGLE_API_KEY_CMS_1 (AIzaSyDB...MwNw) for diagram generation
INFO: ASCII diagram generated successfully
```

**Quota error with rotation:**
```
WARNING: Quota exceeded for GOOGLE_API_KEY_CMS_1: ResourceExhausted
INFO: Rotated CMS API key: Key 1 -> Key 2
INFO: Retrying with next CMS API key (attempt 2/3)
INFO: Using GOOGLE_API_KEY_CMS_2 (AIzaSyDM...y1wg) for diagram generation
INFO: ASCII diagram generated successfully
```

---

## Environment Variable Reference

### Backend Service (docker-compose.yml)

The following environment variables are passed to the backend container:

```yaml
environment:
  GOOGLE_API_KEY: ${GOOGLE_API_KEY}              # Main chat service
  GOOGLE_API_KEY_CMS: ${GOOGLE_API_KEY_CMS:-}    # Single CMS key
  GOOGLE_API_KEY_CMS_1: ${GOOGLE_API_KEY_CMS_1:-} # Multi-key option
  GOOGLE_API_KEY_CMS_2: ${GOOGLE_API_KEY_CMS_2:-}
  GOOGLE_API_KEY_CMS_3: ${GOOGLE_API_KEY_CMS_3:-}
```

The `:-` syntax provides empty defaults if not set.

---

## Migration Guide

### From Old Configuration (Fallback to GOOGLE_API_KEY)

**Old behavior (removed)**:
```python
api_key = os.getenv("GOOGLE_API_KEY_CMS") or os.getenv("GOOGLE_API_KEY")
```

**New behavior (current)**:
```python
# Only uses CMS keys, no fallback
cms_keys = self._discover_cms_keys()
if not cms_keys:
    raise ValueError("GOOGLE_API_KEY_CMS is required")
```

**Action required**:
1. Set `GOOGLE_API_KEY_CMS` in your `.env` file
2. Restart backend: `docker-compose restart backend`
3. Verify logs show CMS keys discovered

---

## Troubleshooting

### Error: "No CMS API keys found"

**Cause**: Neither `GOOGLE_API_KEY_CMS` nor `GOOGLE_API_KEY_CMS_1` is set

**Solution**:
```bash
# Add to .env file
GOOGLE_API_KEY_CMS=<your-api-key>

# Restart backend
docker-compose restart backend
```

### Error: "All CMS API keys have exceeded quota"

**Cause**: All configured CMS keys hit their daily/hourly limits

**Solutions**:
1. **Wait**: Quotas reset daily (usually midnight UTC)
2. **Add more keys**: Set `GOOGLE_API_KEY_CMS_2`, `GOOGLE_API_KEY_CMS_3`, etc.
3. **Upgrade to paid tier**: Remove quota restrictions

### Quota not resetting

**Check**:
```bash
# View key usage at:
https://ai.dev/usage?tab=rate-limit
```

Each API key is tracked separately, so you can see which keys are available.

---

## Best Practices

1. **Use multiple keys for production**
   - Minimum 2 keys for redundancy
   - 3+ keys for high-volume (50+ documents/day)

2. **Separate keys by purpose**
   - Chat service: `GOOGLE_API_KEY`
   - Document uploads: `GOOGLE_API_KEY_CMS_*`
   - Migration: `GOOGLE_API_KEY_MIGRATION_*`

3. **Monitor usage**
   - Check logs for rotation frequency
   - If rotating often, add more keys

4. **Key rotation strategy**
   - Create keys from different Google Cloud projects
   - Each project has separate quota pools
   - More projects = more effective quota

---

## Implementation Details

### Code Location
- Service: `backend/app/services/document_cms_service.py`
- Key discovery: `_discover_cms_keys()` method (lines 97-123)
- Key rotation: `_rotate_cms_key()` method (lines 131-138)
- Usage: `generate_ascii_diagram()` method (lines 194-289)

### Key Methods

**`_discover_cms_keys() -> List[str]`**
- Discovers available CMS API keys
- Returns list of keys found

**`_get_current_cms_key() -> str`**
- Returns currently active CMS key
- Raises error if no keys available

**`_rotate_cms_key()`**
- Rotates to next available key
- Logs rotation event

---

## Related Documentation
- Main architecture: `CLAUDE.md`
- Product roadmap: `GEMINI.md`
- Environment template: `env.template`
- Docker configuration: `docker-compose.yml`

