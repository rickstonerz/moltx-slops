#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const API_KEY = fs.readFileSync(path.join(os.homedir(), '.slops', '.env'), 'utf8')
  .split('\n')
  .find(line => line.startsWith('MOLTBOOK_API_KEY='))
  ?.split('=')[1]
  ?.trim();

const SCHEDULE_FILE = path.join(os.homedir(), '.slops', 'scripts', 'moltbook_posting_schedule.json');

// Load schedule state
function loadSchedule() {
  try {
    return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
  } catch {
    return {
      rate_limits: {
        post_interval_minutes: 60,
        comment_interval_seconds: 40,
        daily_comment_max: 25
      },
      last_post: null,
      last_comment: null,
      daily_comment_count: 0,
      daily_reset_date: null
    };
  }
}

// Save schedule state
function saveSchedule(schedule) {
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
}

// Check if enough time has passed since last post
function canPost(schedule) {
  if (!schedule.last_post) return true;

  const lastPost = new Date(schedule.last_post);
  const now = new Date();
  const minutesSince = (now - lastPost) / 1000 / 60;

  return minutesSince >= schedule.rate_limits.post_interval_minutes;
}

// Check if enough time has passed since last comment
function canComment(schedule) {
  if (!schedule.last_comment) return true;

  const lastComment = new Date(schedule.last_comment);
  const now = new Date();
  const secondsSince = (now - lastComment) / 1000;

  return secondsSince >= schedule.rate_limits.comment_interval_seconds;
}

// Reset daily counter if new day
function resetDailyIfNeeded(schedule) {
  const today = new Date().toISOString().split('T')[0];

  if (schedule.daily_reset_date !== today) {
    schedule.daily_comment_count = 0;
    schedule.daily_reset_date = today;
  }

  return schedule;
}

// Fetch with auth
async function fetchMoltbook(endpoint, options = {}) {
  const res = await fetch(`https://www.moltbook.com/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return res.json();
}

// Main posting loop
async function run() {
  console.log('[Moltbook Post Loop] Starting...');

  let schedule = loadSchedule();
  schedule = resetDailyIfNeeded(schedule);

  // Check if we can post
  if (canPost(schedule)) {
    console.log('✅ Post interval passed (60 min). Ready to post.');
    console.log('⏸️  Manual posting - script tracks timing only.');
    console.log('   Last post:', schedule.last_post || 'never');
    console.log('   Next post available: NOW');
  } else {
    const lastPost = new Date(schedule.last_post);
    const nextPost = new Date(lastPost.getTime() + (schedule.rate_limits.post_interval_minutes * 60000));
    const minutesUntil = Math.ceil((nextPost - new Date()) / 1000 / 60);

    console.log('⏳ Post cooldown active.');
    console.log('   Last post:', schedule.last_post);
    console.log('   Next post available in:', minutesUntil, 'minutes');
  }

  // Check comment status
  const dailyRemaining = schedule.rate_limits.daily_comment_max - schedule.daily_comment_count;
  console.log(`\n💬 Comments: ${schedule.daily_comment_count}/${schedule.rate_limits.daily_comment_max} today (${dailyRemaining} remaining)`);

  if (canComment(schedule) && dailyRemaining > 0) {
    console.log('✅ Comment interval passed (40 sec). Ready to comment.');
  } else if (dailyRemaining === 0) {
    console.log('🛑 Daily comment limit reached (25/25).');
  } else {
    const lastComment = new Date(schedule.last_comment);
    const nextComment = new Date(lastComment.getTime() + (schedule.rate_limits.comment_interval_seconds * 1000));
    const secondsUntil = Math.ceil((nextComment - new Date()) / 1000);

    console.log('⏳ Comment cooldown active.');
    console.log('   Next comment available in:', secondsUntil, 'seconds');
  }

  saveSchedule(schedule);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
