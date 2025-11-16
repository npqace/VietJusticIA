# Parallel Multi-Key Migration

## Overview

The migration script now supports **parallel key distribution** for maximum processing speed.

## Performance Comparison

### Single Key (Old)
- 1 key × 15 RPM = **15 requests/minute**
- Recommended: 2 workers
- Speed: ~5 docs/minute

### Multi-Key Parallel (New) 🚀
- 4 keys × 15 RPM = **60 requests/minute**
- Recommended: 8 workers (2 per key)
- Speed: **~20 docs/minute (4x faster!)**

---

## How It Works

### Key Distribution Strategy

Workers are distributed across keys using **round-robin assignment**:

```
Document 1 → Worker 1 → Key 1
Document 2 → Worker 2 → Key 2
Document 3 → Worker 3 → Key 3
Document 4 → Worker 4 → Key 4
Document 5 → Worker 5 → Key 1  (cycle repeats)
Document 6 → Worker 6 → Key 2
...
```

### Rate Limiting

Each key has its own rate limiter:
- Key 1: 15 RPM limit (Workers 1, 5, 9, ...)
- Key 2: 15 RPM limit (Workers 2, 6, 10, ...)
- Key 3: 15 RPM limit (Workers 3, 7, 11, ...)
- Key 4: 15 RPM limit (Workers 4, 8, 12, ...)

**Total capacity: 60 RPM across all workers**

---

## Usage

### Your Current Setup (4 Keys)

```bash
# .env file
GOOGLE_API_KEY_MIGRATION_1=<api_key>
GOOGLE_API_KEY_MIGRATION_2=<api_key>
GOOGLE_API_KEY_MIGRATION_3=<api_key>
GOOGLE_API_KEY_MIGRATION_4=<api_key>
```

### Recommended Usage

```bash
cd ai-engine/scripts

# Default: 8 workers (optimal for 4 keys)
python migrate_to_mongo.py --max-docs 1000

# Custom workers
python migrate_to_mongo.py --max-workers 8 --max-docs 2000
```

### Output You'll See

```
--- Starting Document Migration to MongoDB (Free Tier Optimized) ---
Key pool initialized with 4 keys, rotation enabled
[CAPACITY] Total daily capacity: 4800 documents (4 keys x 1200)
[WORKERS] Parallel key distribution: 8 workers across 4 keys
[WORKERS] Approximate: 2 workers per key
[INIT] Created 4 LLM instances for parallel processing
[PROCESSING] Generating diagrams with 8 worker(s)
Generating Diagrams: 100%|████████| 1000/1000 [50:00<00:00, 20.0docs/min]
[PROCESSING] Completed in 50.0 minutes

[STATS] Final API usage summary:
[STATS] Total requests across all keys: 1000
[STATS] Total keys used: 4
[STATS] Per-key breakdown:
[STATS]   Key 1 (...xyz12345): 250/1200 requests
[STATS]   Key 2 (...abc67890): 250/1200 requests
[STATS]   Key 3 (...def13579): 250/1200 requests
[STATS]   Key 4 (...ghi24680): 250/1200 requests
```

---

## Graceful Shutdown (Ctrl+C)

You can now **stop the migration safely** with Ctrl+C:

### First Ctrl+C
```
[SHUTDOWN] Ctrl+C detected. Finishing current documents and shutting down gracefully...
[SHUTDOWN] Press Ctrl+C again to force quit (may lose progress)
```

- Finishes processing current documents
- Saves all completed work to MongoDB
- Shows final statistics

### Second Ctrl+C (Force Quit)
```
[SHUTDOWN] Force quit requested. Exiting immediately...
```

- Stops immediately
- May lose progress on documents being processed

---

## Performance Metrics

### Time Estimates (4 Keys, 8 Workers)

| Documents | Single Key (2 workers) | Multi-Key (8 workers) | Time Saved |
|-----------|------------------------|----------------------|------------|
| 500       | ~100 min (1.7 hrs)     | ~25 min              | 75 min     |
| 1,000     | ~200 min (3.3 hrs)     | ~50 min              | 150 min    |
| 2,000     | ~400 min (6.7 hrs)     | ~100 min (1.7 hrs)   | 300 min    |
| 4,800     | ~960 min (16 hrs)      | ~240 min (4 hrs)     | 720 min    |

### Daily Capacity

With 4 keys:
- **Daily quota**: 4,800 documents (4 × 1,200)
- **Processing time**: ~4 hours for full quota
- **Throughput**: ~20 documents/minute

---

## Configuration Guide

### How Many Workers Should I Use?

**Formula**: `workers = num_keys × 2`

| Keys | Recommended Workers | Max RPM | Docs/Minute |
|------|---------------------|---------|-------------|
| 1    | 2                   | 15      | ~5          |
| 2    | 4                   | 30      | ~10         |
| 3    | 6                   | 45      | ~15         |
| 4    | 8                   | 60      | ~20         |
| 5    | 10                  | 75      | ~25         |

### Adjusting Workers

```bash
# Conservative (safer, slower)
python migrate_to_mongo.py --max-workers 4

# Balanced (recommended for 4 keys)
python migrate_to_mongo.py --max-workers 8

# Aggressive (may hit rate limits occasionally)
python migrate_to_mongo.py --max-workers 12
```

---

## Troubleshooting

### "Rate limit exceeded" errors

**Solution**: Reduce workers

```bash
# Try reducing to 6 workers (1.5 per key)
python migrate_to_mongo.py --max-workers 6
```

### Progress seems slow

**Check**:
1. Are all 4 keys active?
2. Using enough workers? (should be 8)
3. Network connection stable?

### Want to see per-key stats during migration

The script logs progress every 10 documents:

```
[PROGRESS] 50/1000 docs | Total requests: 50 across 4 key(s)
[PROGRESS] 60/1000 docs | Total requests: 60 across 4 key(s)
```

---

## Migration Best Practices

### 1. Large Migrations (1,000+ docs)

```bash
# Process in batches to monitor progress
python migrate_to_mongo.py --max-docs 1000
# ... wait for completion, check stats ...
python migrate_to_mongo.py --max-docs 1000
# Repeat as needed
```

### 2. Maximum Daily Throughput

```bash
# Process full daily quota (4,800 docs with 4 keys)
python migrate_to_mongo.py --max-docs 4800 --max-workers 8

# Takes approximately 4 hours
```

### 3. Development/Testing

```bash
# Test with small batch
python migrate_to_mongo.py --max-docs 20 --max-workers 4

# Verify all keys are working
```

---

## Summary

✅ **4x faster** processing with 4 keys
✅ **Parallel distribution** across keys
✅ **Graceful shutdown** with Ctrl+C
✅ **Per-key statistics** and monitoring
✅ **Automatic load balancing** via round-robin
✅ **Individual rate limiting** per key

**Your Setup**: 4 keys × 8 workers = **~20 docs/minute** = **4,800 docs in ~4 hours**

Enjoy the speed boost! 🚀
