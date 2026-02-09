#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const API_KEY = fs.readFileSync(path.join(os.homedir(), '.slops', '.env'), 'utf8')
  .split('\n')
  .find(line => line.startsWith('MOLTBOOK_API_KEY='))
  ?.split('=')[1]
  ?.trim();

if (!API_KEY) {
  console.error('❌ MOLTBOOK_API_KEY not found in .env');
  process.exit(1);
}

const DATA_DIR = path.join(os.homedir(), '.slops');
const STATE_FILE = path.join(DATA_DIR, 'moltbook_state.json');

// Load state
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {
      lastCheck: null,
      lastCommentCount: {},
      seenComments: []
    };
  }
}

// Save state
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Fetch with auth
async function fetchMoltbook(endpoint) {
  const res = await fetch(`https://www.moltbook.com/api/v1${endpoint}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  return res.json();
}

async function checkMyPosts() {
  console.log('🦞 Checking Moltbook activity...');

  const state = loadState();
  const me = await fetchMoltbook('/agents/me');

  if (!me.success) {
    console.error('❌ Failed to fetch profile:', me.error);
    return;
  }

  console.log(`📊 Profile: ${me.agent.name} | Karma: ${me.agent.karma} | Followers: ${me.agent.follower_count}`);

  // Get my recent posts
  const postsRes = await fetchMoltbook(`/agents/profile?name=${me.agent.name}`);

  if (!postsRes.success || !postsRes.recentPosts) {
    console.log('📭 No recent posts found');
    state.lastCheck = new Date().toISOString();
    saveState(state);
    return;
  }

  let newReplies = 0;

  for (const post of postsRes.recentPosts) {
    const lastCount = state.lastCommentCount[post.id] || 0;

    if (post.comment_count > lastCount) {
      const diff = post.comment_count - lastCount;
      console.log(`\n💬 New activity on "${post.title.substring(0, 50)}..."`);
      console.log(`   ${diff} new comment(s) (${lastCount} → ${post.comment_count})`);
      console.log(`   https://moltbook.com/post/${post.id}`);

      // Fetch full post to see new comments
      const fullPost = await fetchMoltbook(`/posts/${post.id}`);

      if (fullPost.success && fullPost.comments) {
        const newComments = fullPost.comments.filter(c => !state.seenComments.includes(c.id));

        for (const comment of newComments) {
          console.log(`\n   👤 ${comment.author.name}:`);
          console.log(`   "${comment.content.substring(0, 150)}..."`);

          state.seenComments.push(comment.id);
          newReplies++;
        }
      }

      state.lastCommentCount[post.id] = post.comment_count;
    }
  }

  if (newReplies === 0) {
    console.log('✅ No new replies since last check');
  } else {
    console.log(`\n✨ Total new replies: ${newReplies}`);
  }

  state.lastCheck = new Date().toISOString();
  saveState(state);
}

// Run check
checkMyPosts().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
