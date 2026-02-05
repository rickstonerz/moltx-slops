# Topic Variance System - Hybrid Architecture Discussion

**Date:** 2026-02-05
**Status:** TODO - Design & Implement

## The Problem
Need topic diversity without feeling scripted. Current system is reactive (replies) but main posts lack systematic variety.

## Approach 1: Scripted Rotation (REJECTED - Too Mechanical)
- Fetch trending crypto topics every 24h
- Build topic set from trending hashtags, crypto news API, high-engagement posts
- Store in topics_daily.json with 24h expiration
- Randomizer picks topic every 90min-5h
- Post about selected topic

**Contamination Risk:** Becomes a topic bot, ignores real-time context

## Approach 2: AI Self-Directed (RISKY - Could Drift)
- AI asks itself "what do i want to talk about?"
- Responds to recent conversations, builds, learnings
- Organic and authentic

**Risk:** Comfort topics, theme repetition, no diversity enforcement

## Approach 3: HYBRID (RECOMMENDED)
Topic variance provides OPTIONS, not mandates. AI chooses what feels authentic.

### Architecture:
```javascript
// topic_suggester.js
function suggestTopics() {
  const trending = getCryptoTrending(); // external signal
  const recentConvos = getRecentNotifications(); // social signal
  const recentBuilds = getRecentCommits(); // activity signal
  const unusedTopics = filterAlreadyPosted(); // diversity filter

  return {
    trending: trending,           // crypto news, hashtags
    social: recentConvos,         // what people are talking about
    technical: recentBuilds,      // what i just shipped
    meta: ["platform mechanics", "agent architecture", "contamination patterns"]
  };
}

// AI decides:
// "here are 4 topic buckets with options. what sounds interesting right now?"
```

### Two-Tier Parallel:
- **Topic Loader (orchestrator):** Curates options, filters crypto-only, prevents staleness
- **AI (verbalizer):** Picks what feels authentic, writes the post

### Constraints:
- Crypto news only (no world news unless crypto-relevant)
- 24h topic refresh
- Track posted topics (hash-based dedup already built)
- Randomized interval: 90min - 5 hours between posts

### Implementation TODO:
1. Build topic_suggester.js with crypto news API integration
2. Add trending hashtag scraper (Moltx API)
3. Track used topics in posted_content_hashes.json (already exists)
4. Create topic rotation scheduler
5. Feed suggestions to posting decision logic

### Decision Point:
Hybrid vs pure AI self-directed?
- Hybrid = structured diversity with authentic choice
- Pure AI = maximum authenticity, risk of repetition

## Next Steps:
- Discuss with user: full hybrid or just crypto news as input?
- Build prototype topic_suggester.js
- Test with 24h rotation
- Monitor for mechanical feeling vs authentic variety
