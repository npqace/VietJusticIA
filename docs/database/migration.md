# Document Migration Guide (Free Tier Optimized)

This guide explains how to use the optimized `migrate_to_mongo.py` script within Gemini API free tier limits.

## Free Tier Limits

- **15 requests per minute (RPM)**
- **1,500 requests per day (RPD)**
- Script uses 80% safety margin: **12 RPM / 1,200 RPD**

---

## Quick Start

### 1. Process Small Batch (< 200 documents)
```bash
cd ai-engine/scripts
python migrate_to_mongo.py
```
This will process documents with default settings (2 workers, respects rate limits).

### 2. Process Daily Quota (200-300 documents/day)
```bash
python migrate_to_mongo.py --max-docs 200
```
Run daily to gradually migrate all documents.

### 3. Check Status
```bash
# See how many documents are pending
python migrate_to_mongo.py --max-docs 0  # Won't process, just shows count
```

---

## Command Options

```bash
python migrate_to_mongo.py [OPTIONS]

Options:
  --force              Force re-migration of all documents (clears collection)
  --max-workers N      Parallel workers (default: 2, max recommended: 3)
  --max-docs N         Limit documents per run (e.g., 200 for daily quota)
  -h, --help           Show help message
```

---

## Migration Strategies

### Strategy 1: Daily Migration (Recommended for >500 docs)
Process documents gradually over multiple days:

```bash
# Day 1: Process 200 documents
python migrate_to_mongo.py --max-docs 200

# Day 2: Process next 200 (script auto-resumes)
python migrate_to_mongo.py --max-docs 200

# Day 3: Continue...
python migrate_to_mongo.py --max-docs 200
```

**Pros:**
- ✅ Stays within free tier
- ✅ No quota errors
- ✅ Best quality diagrams

**Cons:**
- ⏱️ Takes multiple days

### Strategy 2: Single-Day Push (For <300 docs)
Process everything in one day:

```bash
# Process all at once
python migrate_to_mongo.py
```

**Pros:**
- ✅ Complete in one session
- ✅ Simple

**Cons:**
- ⚠️ May hit daily quota if >1,200 docs

### Strategy 3: Aggressive (Use 3 workers)
Process faster but riskier:

```bash
python migrate_to_mongo.py --max-workers 3 --max-docs 300
```

**Pros:**
- ⚡ Faster processing
- ✅ Still within limits (usually)

**Cons:**
- ⚠️ Closer to rate limits
- ⚠️ May occasionally throttle

---

## Example Workflows

### Scenario 1: You have 500 documents to migrate

**Plan: 3-day migration**

```bash
# Check how many docs need migration
python migrate_to_mongo.py --max-docs 0

# Day 1 (morning): Process 200 docs
python migrate_to_mongo.py --max-docs 200
# Time: ~16 minutes

# Day 2 (morning): Process next 200 docs
python migrate_to_mongo.py --max-docs 200
# Time: ~16 minutes

# Day 3 (morning): Process remaining 100 docs
python migrate_to_mongo.py --max-docs 100
# Time: ~8 minutes
```

**Total time**: ~40 minutes of actual processing, spread over 3 days.

### Scenario 2: You have 100 documents (quick migration)

```bash
# Process all at once
python migrate_to_mongo.py

# Expected output:
# ✅ Rate limiter initialized: 12 RPM, 1200 RPD
# 📄 Found 100 new documents to process.
# ⏱️  Estimated time: ~8.3 minutes
# 📊 Daily quota: 0/1200 used, 1200 remaining
# 🚀 Generating diagrams with 2 worker(s)...
# [Progress bar]
# ✅ Processing completed in 8.5 minutes
# 📊 Final API Usage: 100/1200 requests today
#    Remaining quota for today: 1100 requests
```

### Scenario 3: Resume interrupted migration

```bash
# Migration was interrupted yesterday at 150/400 docs
# Today, just run again - it auto-resumes:
python migrate_to_mongo.py --max-docs 200

# Script will:
# - Skip the 150 already migrated docs
# - Process next 200 of the remaining 250
```

---

## Monitoring Progress

### During Migration
The script shows real-time stats every 10 documents:
```
📊 Progress: 50/200 | RPM: 8/12 | Daily: 50/1200
```

### After Migration
```
✅ Processing completed in 16.2 minutes
📊 Final API Usage: 200/1200 requests today
   Remaining quota for today: 1000 requests

💡 150 documents remaining.
   To continue: python migrate_to_mongo.py --max-docs 150
```

---

## Troubleshooting

### Problem: "Rate limit exceeded" errors
**Cause**: Too many parallel workers or system clock issues.

**Solution**:
```bash
# Reduce to 1 worker temporarily
python migrate_to_mongo.py --max-workers 1
```

### Problem: "Daily quota exceeded"
**Cause**: Already used 1,200+ requests today.

**Solution**:
```bash
# Wait until tomorrow (quota resets daily)
# Or upgrade to paid tier
```

### Problem: Migration is too slow
**Current speed**: ~5 seconds/document = ~12 docs/minute

**To speed up** (if within quota):
```bash
python migrate_to_mongo.py --max-workers 3  # Faster but riskier
```

### Problem: Want to re-process all documents
**Use case**: Improved prompt, need better diagrams

**Solution**:
```bash
# WARNING: This clears all existing documents!
python migrate_to_mongo.py --force
```

---

## Performance Expectations

| Documents | Workers | Estimated Time | API Calls |
|-----------|---------|----------------|-----------|
| 50        | 2       | ~4 minutes     | 50        |
| 100       | 2       | ~8 minutes     | 100       |
| 200       | 2       | ~16 minutes    | 200       |
| 500       | 2       | ~40 minutes    | 500       |
| 1,000     | 2       | ~1.5 hours     | 1,000     |
| 1,200     | 2       | ~2 hours       | 1,200 (daily max) |

**Note**: Processing pauses when rate limits are reached, then automatically resumes.

---

## Tips for Efficient Migration

1. **Run during off-peak hours** - Less likely to have other API usage
2. **Use screen/tmux** on Linux - Prevents disconnection during long migrations
3. **Monitor quota** - Check remaining daily quota before large batches
4. **Batch by 200-300** - Optimal balance of progress vs. safety
5. **Be patient** - Free tier quality is worth the wait!

---

## Upgrading to Paid Tier

If you need faster migrations:

**Paid Tier Benefits:**
- 1,000 RPM (vs. 15 RPM)
- Unlimited daily requests
- Cost: ~$7 per 1 million tokens

**To upgrade:**
1. Enable billing in Google Cloud Console
2. Update script settings:
   ```bash
   # Edit migrate_to_mongo.py line 41-45:
   rate_limiter = GeminiRateLimiter(
       requests_per_minute=100,   # Much higher!
       requests_per_day=100000,   # Effectively unlimited
       burst_allowance=1.0
   )
   ```
3. Use more workers:
   ```bash
   python migrate_to_mongo.py --max-workers 10
   ```

**Expected improvement:**
- 1,000 documents: ~10 minutes (vs. 1.5 hours)
- Cost: ~$5-10 total for entire migration

---

## Questions?

- Check CLAUDE.md for architecture details
- See backend optimization in CLAUDE.md → "Gemini Free Tier Optimization"
- Review rate_limiter.py source code for implementation details
