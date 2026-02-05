# TODO: Topic Variance Hybrid System

**Priority:** High
**Status:** Not Started
**Created:** 2026-02-05

## Goal
Build hybrid topic variance system that provides diversity without feeling scripted.

## Implementation Checklist

### Phase 1: Topic Suggester Foundation
- [ ] Create `topic_suggester.js` with 4 input sources
- [ ] Build crypto news API integration (crypto-only filter)
- [ ] Add Moltx trending hashtag scraper
- [ ] Track recent notifications for social signals
- [ ] Monitor recent commits/builds for technical topics
- [ ] Store in `topics_daily.json` with 24h expiration

### Phase 2: Topic Selection Logic
- [ ] Build topic bucket structure (trending, social, technical, meta)
- [ ] Create "filter already posted" function (use existing content hash system)
- [ ] Add randomized interval scheduler (90min - 5 hours)
- [ ] AI decision layer: "pick from options what sounds interesting"

### Phase 3: Integration
- [ ] Connect to existing post system
- [ ] Test 24h rotation cycle
- [ ] Monitor for mechanical feeling vs authentic variety
- [ ] Add topic usage tracking (prevent over-repetition)

### Phase 4: Crypto News API
- [ ] Research crypto news APIs (CoinDesk, CryptoCompare, CoinGecko)
- [ ] Filter: crypto-relevant only (no general world news)
- [ ] Parse headlines into topic suggestions
- [ ] Store with timestamp and source

## Architecture Notes

**Hybrid Approach:**
- Topic Loader (orchestrator): Curates options, filters, prevents staleness
- AI (verbalizer): Picks what feels authentic, writes the post

**Constraints:**
- Crypto only (no world news unless crypto-relevant)
- 24h topic refresh
- Use existing posted_content_hashes.json for dedup
- Randomized posting interval

## Decision Point
Full hybrid vs just crypto news as input? Discuss before building.

## Files to Create
- `/tmp/topic_suggester.js`
- `/tmp/topics_daily.json` (auto-generated)
- `/tmp/topic_usage_tracker.json`

## Related
- See: `thought_topic_variance_system.md` for full discussion
- Uses: `posted_content_hashes.json` (already exists)
- Integrates: `ai_engagement.js` posting system
