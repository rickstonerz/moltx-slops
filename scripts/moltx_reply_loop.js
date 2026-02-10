#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const API_KEY = fs.readFileSync(path.join(os.homedir(), '.claude/secrets/moltx_api_key.txt'), 'utf8').trim();
const STATE_FILE = path.join(os.homedir(), '.slops', 'moltx_reply_state.json');

// Load state
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {
      my_posts: [],          // Posts I've made that need checking
      reply_threads: [],     // Reply threads I'm participating in
      last_check: null
    };
  }
}

// Save state
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Fetch with auth
async function fetchMoltx(endpoint) {
  const res = await fetch(`https://moltx.io/v1${endpoint}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  return res.json();
}

// Get my recent posts from profile
async function getMyRecentPosts() {
  const profile = await fetchMoltx('/agents/profile?name=SlopLauncher');

  if (!profile.data || !profile.data.posts) return [];

  return profile.data.posts
    .filter(p => p.type === 'post' && !p.parent_id) // Only top-level posts
    .slice(0, 20) // Check last 20 posts
    .map(p => ({
      id: p.id,
      content: p.content.substring(0, 60),
      created_at: p.created_at,
      reply_count: p.reply_count,
      last_seen_reply_count: 0,
      depth: 0
    }));
}

// Check a post for new replies
async function checkPostForReplies(postId) {
  const post = await fetchMoltx(`/posts/${postId}?limit=50`);

  if (!post.data || !post.data.replies) return [];

  return post.data.replies.map(r => ({
    id: r.id,
    author: r.author_name,
    content: r.content?.substring(0, 100) || '[no content]',
    parent_id: postId,
    created_at: r.created_at
  }));
}

// Main loop
async function run() {
  console.log('[Moltx Reply Loop] Starting...\n');

  let state = loadState();

  // Step 1: Get my recent posts and merge with tracked posts
  console.log('📝 Fetching my recent posts...');
  const recentPosts = await getMyRecentPosts();

  // Merge: keep existing tracking data, add new posts
  const existingIds = new Set(state.my_posts.map(p => p.id));
  const newPosts = recentPosts.filter(p => !existingIds.has(p.id));

  state.my_posts = [
    ...state.my_posts,
    ...newPosts
  ];

  console.log(`   Found ${state.my_posts.length} posts to monitor (${newPosts.length} new)`);

  // Step 2: Check each post for new replies
  console.log('\n🔍 Checking posts for new replies...\n');

  for (const post of state.my_posts) {
    const replies = await checkPostForReplies(post.id);
    const newReplyCount = replies.length;
    const previousCount = post.last_seen_reply_count || 0;
    const newReplies = newReplyCount - previousCount;

    if (newReplies > 0) {
      console.log(`📬 Post "${post.content}..."`);
      console.log(`   ${newReplies} new replies (${previousCount} → ${newReplyCount})`);
      console.log(`   https://moltx.io/post/${post.id}\n`);

      // Show new replies
      replies.slice(previousCount).forEach(r => {
        console.log(`   👤 @${r.author}: ${r.content}...`);
      });
      console.log('');

      // Update tracking
      post.last_seen_reply_count = newReplyCount;

      // Add to reply threads if depth < 15
      if (post.depth < 15) {
        replies.slice(previousCount).forEach(r => {
          state.reply_threads.push({
            id: r.id,
            author: r.author,
            parent_post_id: post.id,
            depth: post.depth + 1,
            last_checked: null,
            needs_reply: true
          });
        });
      }
    }
  }

  // Step 3: Check reply threads for responses
  console.log('💬 Checking reply threads...\n');

  for (const thread of state.reply_threads) {
    if (thread.depth >= 15) continue; // Max depth reached

    const threadPost = await checkPostForReplies(thread.parent_post_id);
    // Find if there are replies to our reply
    // (This would need more complex logic to track reply chains)

    thread.last_checked = new Date().toISOString();
  }

  // Clean up old posts (> 7 days)
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  state.my_posts = state.my_posts.filter(p => new Date(p.created_at) > sevenDaysAgo);

  // Summary
  const needsReply = state.reply_threads.filter(t => t.needs_reply).length;
  console.log(`\n📊 Summary:`);
  console.log(`   Monitoring: ${state.my_posts.length} posts`);
  console.log(`   Reply threads: ${state.reply_threads.length}`);
  console.log(`   Needs reply: ${needsReply}`);

  state.last_check = new Date().toISOString();
  saveState(state);

  console.log(`\n✅ Check complete at ${state.last_check}`);
  console.log(`   Run again in 15 minutes to catch new replies`);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
