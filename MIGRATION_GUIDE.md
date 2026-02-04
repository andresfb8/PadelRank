# Configuration Migration Guide

## 📋 Overview

This guide explains how to migrate existing tournament rankings from the old flat configuration structure to the new namespaced format-specific configurations.

## 🎯 Why Migrate?

**Before (Flat Structure - Problematic):**
```typescript
{
  config: {
    pointsPerWin2_0: 4,  // Which format is this for?
    scoringMode: '32',   // Americano? Mexicano?
    // Mixed configuration for all formats
  }
}
```

**After (Namespaced - Isolated):**
```typescript
{
  config: {
    classicConfig: {
      pointsPerWin2_0: 4,
      pointsPerWin2_1: 3,
      // ... Classic-specific settings
    },
    americanoConfig: {
      scoringMode: '32'
      // ... Americano-specific settings
    }
  }
}
```

## 🚀 Migration Steps

### Step 1: Dry Run (Recommended)

Test the migration without making changes:

```bash
npm run migrate:dry
```

This will:
- ✅ Scan all rankings in Firestore
- ✅ Show what would be migrated
- ✅ Display before/after configs
- ❌ **NOT** save any changes

**Expected Output:**
```
🚀 Starting migration (DRY RUN mode)...
📊 Found 42 rankings to process

✅ Migrating ranking-123 (classic)
   Old config: { pointsPerWin2_0: 4, ... }
   New config: { classicConfig: { pointsPerWin2_0: 4, ... } }

⏭️  Skipping ranking-456 (americano) - already migrated

📈 Migration Summary:
   Total rankings: 42
   Migrated: 35
   Skipped: 7
   Errors: 0

📊 By Format:
   classic: 20
   americano: 8
   hybrid: 7
```

### Step 2: Review Changes

Carefully review the output to ensure:
- ✅ All rankings are detected
- ✅ Format detection is correct
- ✅ Config migration looks reasonable
- ✅ No errors reported

### Step 3: Backup Database

**CRITICAL:** Before running the live migration, create a Firestore backup:

```bash
# Using Firebase CLI
firebase firestore:export gs://your-bucket/backups/pre-migration-$(date +%Y%m%d)

# Or use Firebase Console
# Firestore → Import/Export → Export
```

### Step 4: Run Live Migration

Once you're confident:

```bash
npm run migrate:live
```

⚠️ **This will modify your database!**

### Step 5: Verify

After migration:

1. **Check a few rankings manually** in Firebase Console
2. **Test the app** with different tournament formats
3. **Verify** that existing tournaments still work

## 🔧 Advanced Usage

### Migrate Single Ranking

To migrate just one tournament:

```bash
npm run migrate single <ranking-id>        # Dry run
npm run migrate single <ranking-id> --live # Live mode
```

### Rollback (Emergency)

If something goes wrong:

```bash
# Restore from backup
firebase firestore:import gs://your-bucket/backups/pre-migration-YYYYMMDD

# Or use the rollback script (if implemented)
npm run migrate rollback
```

## 🛡️ Safety Features

### 1. Idempotent
The migration can be run multiple times safely. Already-migrated rankings are skipped.

### 2. Backward Compatible
Legacy fields are preserved, so old code continues to work during transition.

### 3. Batch Processing
Large databases are processed in batches to avoid Firestore limits.

### 4. Error Handling
Errors are logged but don't stop the entire migration.

## 📊 Migration Logic by Format

### Classic Format
```typescript
// Old
{ pointsPerWin2_0: 4, pointsPerWin2_1: 3, ... }

// New
{ classicConfig: { pointsPerWin2_0: 4, pointsPerWin2_1: 3, ... } }
```

### Americano/Mexicano
```typescript
// Old
{ scoringMode: '32', customPoints: 32 }

// New
{ americanoConfig: { scoringMode: '32', totalPoints: 32 } }
```

### Hybrid/Elimination/Pozo
These formats already used nested configs, so migration just ensures consistency.

## ⚠️ Common Issues

### Issue: "Cannot find module 'firebase'"
**Solution:** Ensure Firebase is configured in `scripts/migrateConfigs.ts`

### Issue: Migration shows 0 rankings
**Solution:** Check Firebase authentication and project configuration

### Issue: Some rankings fail to migrate
**Solution:** Check the error logs and migrate those individually

## 📝 Post-Migration Checklist

- [ ] All rankings migrated successfully
- [ ] No errors in migration log
- [ ] Tested Classic format tournaments
- [ ] Tested Americano/Mexicano tournaments
- [ ] Tested Hybrid tournaments
- [ ] Tested Elimination tournaments
- [ ] Legacy code still works (backward compatibility)
- [ ] New code uses namespaced configs

## 🔄 Updating Application Code

After migration, update your code to use the new structure:

### Before
```typescript
const points = ranking.config?.pointsPerWin2_0 || 4;
```

### After
```typescript
import { getFormatConfig } from './utils/configMigration';

const classicConfig = getFormatConfig<ClassicConfig>(
  ranking.config,
  'classic',
  'classicConfig'
);
const points = classicConfig?.pointsPerWin2_0 || 4;
```

## 📞 Support

If you encounter issues:
1. Check the migration logs
2. Review this guide
3. Test with a single ranking first
4. Ensure you have a backup before live migration

---

**Remember:** Always backup before migrating production data!
