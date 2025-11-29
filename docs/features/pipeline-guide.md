# VietJusticia Data Pipeline - Enhanced Usage Guide

This guide explains how to use the enhanced pipeline with intelligent skip functionality and granular control.

## 🎯 What's New

### Enhanced Crawler (`crawler.py`)
- ✅ **Automatic Skip Detection**: Skips already-crawled documents
- ✅ **Smart Resume**: Continue from where you left off
- ✅ **Detailed Statistics**: Shows newly crawled vs. skipped documents
- ✅ **Resource Efficient**: Saves time and API calls

### Enhanced Pipeline (`pipeline.py`)
- ✅ **Skip Individual Steps**: Run only what you need
- ✅ **Fine-grained Control**: Control workers, batch sizes, etc.
- ✅ **Better Logging**: Clear progress indicators
- ✅ **Flexible Workflows**: Mix and match pipeline stages

---

## 📚 Quick Reference

### Full Pipeline (All Steps)
```bash
# Crawl 100 docs, clean, migrate, vectorize
python pipeline.py --max-docs 100
```

### Incremental Data Addition
```bash
# Day 1: Crawl 200 new documents (skips existing)
python pipeline.py --max-docs 200

# Day 2: Process 200 more (automatically resumes)
python pipeline.py --max-docs 200 --migration-max-docs 200
```

### Partial Pipeline Runs
```bash
# Only migration + vectorization (skip crawl/clean)
python pipeline.py --skip-crawl --skip-clean --migration-max-docs 200

# Only vectorization (data already in MongoDB)
python pipeline.py --skip-crawl --skip-clean --skip-migrate

# Only crawl and clean (no processing)
python pipeline.py --max-docs 50 --skip-migrate --skip-vectorize
```

---

## 🔧 Detailed Command Options

### Pipeline Arguments

#### Crawler Control
```bash
--max-docs N              # Limit documents to crawl
--max-pages N             # Limit API pages to fetch
--status-filter "STATUS"  # Filter by status (default: "Còn hiệu lực")
--category "CATEGORY"     # Filter by category (e.g., "Giáo dục")
```

#### Migration Control
```bash
--migration-workers N     # Parallel workers (default: 8)
--migration-max-docs N    # Limit docs to migrate (quota management)
```

#### Vector Store Control
```bash
--vector-batch-size N     # Batch size for embedding (default: 64)
```

#### Pipeline Flow Control
```bash
--skip-crawl              # Skip crawling step
--skip-clean              # Skip cleaning step
--skip-migrate            # Skip MongoDB migration
--skip-vectorize          # Skip vectorization
--force-rerun             # Force re-run all steps (clears existing data)
```

---

## 💡 Common Workflows

### Workflow 1: Fresh Start (500 New Documents)

**Scenario**: Starting from scratch, want to add 500 documents over 3 days.

```bash
# Day 1: Crawl 500 documents (15 minutes)
cd ai-engine
python pipeline.py --max-docs 500 --skip-migrate --skip-vectorize

# Clean immediately (5 minutes)
python pipeline.py --skip-crawl --skip-migrate --skip-vectorize

# Day 2: Migrate first 200 documents (16 minutes)
python pipeline.py --skip-crawl --skip-clean --skip-vectorize --migration-max-docs 200

# Day 3: Migrate next 200 documents (16 minutes)
python pipeline.py --skip-crawl --skip-clean --skip-vectorize --migration-max-docs 200

# Day 4: Migrate final 100 + vectorize (45 minutes)
python pipeline.py --skip-crawl --skip-clean --migration-max-docs 100
```

**Total**: ~1.5 hours of active work over 4 days

---

### Workflow 2: Incremental Addition (Already have data)

**Scenario**: You have 2,500 documents, want to add 500 more.

```bash
# Step 1: Crawl new documents (automatically skips existing)
python pipeline.py --max-docs 500 --skip-migrate --skip-vectorize

# Expected output:
# ✅ Newly crawled: 500
# ⏭️  Skipped (already exist): 0

# Step 2: Clean new documents
python pipeline.py --skip-crawl --skip-migrate --skip-vectorize

# Step 3: Migrate new documents (200/day for 3 days)
python pipeline.py --skip-crawl --skip-clean --skip-vectorize --migration-max-docs 200

# Step 4: Vectorize all new documents (once migration complete)
python pipeline.py --skip-crawl --skip-clean --skip-migrate
```

---

### Workflow 3: Category-Specific Crawling

**Scenario**: Want to add documents from specific legal categories.

```bash
# Crawl education documents
python pipeline.py --max-docs 100 --category "Giáo dục"

# Crawl business documents
python pipeline.py --max-docs 100 --category "Doanh nghiệp"

# Crawl health documents
python pipeline.py --max-docs 100 --category "Y tế"
```

**The crawler will automatically skip any that were already crawled!**

---

### Workflow 4: Resume After Interruption

**Scenario**: Crawler crashed at 150/500 documents.

```bash
# Just run the same command again
python pipeline.py --max-docs 500

# The crawler will:
# ✅ Skip the 150 already crawled
# ✅ Continue with the remaining 350
# Output: "Newly crawled: 350, Skipped (already exist): 150"
```

---

### Workflow 5: Re-vectorization (After Model Upgrade)

**Scenario**: Updated embedding model, need to rebuild vectors.

```bash
# Only rebuild vectors (keep MongoDB data)
python pipeline.py --skip-crawl --skip-clean --skip-migrate --force-rerun

# Or use the vector script directly
cd ai-engine/scripts
python build_vector_store.py --force-rebuild --batch-size 128
```

---

### Workflow 6: Fix Broken Diagrams

**Scenario**: Improved diagram prompt, want to regenerate diagrams.

```bash
# Re-migrate with better prompts (force flag clears MongoDB)
python pipeline.py --skip-crawl --skip-clean --skip-vectorize --force-rerun --migration-max-docs 200

# Then vectorize
python pipeline.py --skip-crawl --skip-clean --skip-migrate
```

---

## 🎓 Understanding the Skip Logic

### How Crawler Skip Detection Works

The crawler checks if a document folder exists with ALL required files:
- `metadata.json` (with matching document ID)
- `content.txt` (not empty)
- `page_content.html` (not empty)
- `screenshot.png` (not empty)

If **any file is missing or empty**, the document will be re-crawled.

### Example Output:
```
============================================================
STARTING CRAWL SESSION
============================================================
 INFO - API reports a total of 1000 documents in this category.
--- Fetching API Page 1 ---
 INFO - [SKIP] Doc 1 (ID: abc123) already crawled: Luật Giáo dục...
 INFO - [SKIP] Doc 2 (ID: def456) already crawled: Nghị định về...
 INFO - Starting task for doc 3 (ID: ghi789)
 INFO - [SUCCESS] (1/100) Saved: Quyết định...
============================================================
CRAWL SESSION COMPLETE
============================================================
📊 Documents examined: 100
✅ Newly crawled: 50
⏭️  Skipped (already exist): 50
============================================================
```

---

## 🚀 Performance Tips

### 1. Optimize Batch Sizes
```bash
# For fast GPU
python pipeline.py --vector-batch-size 256

# For CPU only
python pipeline.py --vector-batch-size 32
```

### 2. Parallel Migration
```bash
# With 4 API keys, use 8 workers (2 per key)
python pipeline.py --migration-workers 8 --migration-max-docs 400
```

### 3. Incremental Processing
```bash
# Crawl in large batches (fast)
python pipeline.py --max-docs 1000 --skip-migrate --skip-vectorize

# Process in smaller batches (quota-friendly)
python pipeline.py --skip-crawl --skip-clean --skip-vectorize --migration-max-docs 200
```

---

## 📊 Monitoring Progress

### Check Crawl Status
```bash
# See what's in your data folder
cd ai-engine/data/raw_data/documents
ls | wc -l  # Count crawled documents
```

### Check MongoDB Status
```bash
# Via MongoDB shell
mongosh
use vietjusticia
db.legal_documents.countDocuments()
```

### Check Qdrant Status
```bash
# Via browser
open http://localhost:6333/dashboard

# Or via Python
python -c "from qdrant_client import QdrantClient; client = QdrantClient('http://localhost:6333'); print(client.get_collection('vietjusticia_legal_docs'))"
```

---

## 🐛 Troubleshooting

### Problem: "Newly crawled: 0, Skipped: 0"
**Cause**: No documents match your filters or all already crawled.

**Solution**: 
```bash
# Try different category
python pipeline.py --max-docs 50 --category "Tài chính"

# Or check API manually
```

### Problem: Crawler keeps re-crawling same documents
**Cause**: Document folders are incomplete or corrupted.

**Solution**:
```bash
# Find incomplete folders
cd ai-engine/data/raw_data/documents
find . -type d -mindepth 1 -maxdepth 1 -exec sh -c 'test $(ls -1 "$1" | wc -l) -lt 4' _ {} \; -print

# Delete them and re-crawl
rm -rf "Incomplete Document Folder Name"
```

### Problem: Pipeline fails at migration step
**Cause**: API quota exceeded.

**Solution**:
```bash
# Check remaining quota in migration logs
# Then limit documents
python pipeline.py --skip-crawl --skip-clean --skip-vectorize --migration-max-docs 100
```

---

## 📋 Recommended Scaling Strategy

### For 5,000 Total Documents (from 2,500)

**Week 1: Crawling (1 day)**
```bash
python pipeline.py --max-docs 2500 --skip-migrate --skip-vectorize
python pipeline.py --skip-crawl --skip-migrate --skip-vectorize
```
**Time**: ~2 hours

**Week 2-3: Migration (10-12 days @ 200/day)**
```bash
# Each day:
python pipeline.py --skip-crawl --skip-clean --skip-vectorize --migration-max-docs 200
```
**Time**: ~16 minutes/day

**Week 3: Vectorization (1 day)**
```bash
python pipeline.py --skip-crawl --skip-clean --skip-migrate --vector-batch-size 128
```
**Time**: ~2 hours

**Total**: ~6 hours active work over 2-3 weeks

---

## 🎯 Best Practices

1. **Always crawl first** - Get all raw data before processing
2. **Clean immediately** - Don't let raw data pile up
3. **Migrate in quotas** - Respect free tier limits
4. **Vectorize last** - Only after all data is in MongoDB
5. **Use skip flags** - Save time on subsequent runs
6. **Monitor logs** - Check for errors after each step
7. **Backup MongoDB** - Before running --force-rerun

---

## 📞 Quick Help

```bash
# View all options
python pipeline.py --help

# Crawler standalone help
python data/crawler/crawler.py --help

# Migration standalone help
python scripts/migrate_to_mongo.py --help

# Vectorization standalone help
python scripts/build_vector_store.py --help
```

---

## ✨ Summary

The enhanced pipeline gives you:
- **Automatic resumption** - No wasted work
- **Flexible control** - Run only what you need  
- **Resource efficiency** - Save time and API calls
- **Better visibility** - Clear progress tracking

Start small, scale gradually, and let the pipeline handle the complexity!

