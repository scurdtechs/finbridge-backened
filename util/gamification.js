function dateKeyUTC(d = new Date()) {
  // YYYY-MM-DD in UTC to avoid timezone issues
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function awardBadge(user, badge) {
  user.badges = user.badges || [];
  if (!user.badges.includes(badge)) user.badges.push(badge);
}

function applyPointThresholdBadges(user) {
  // Simple deterministic badges by points.
  if ((user.points || 0) >= 1000) awardBadge(user, "Legend");
  if ((user.points || 0) >= 500) awardBadge(user, "Champion");
  if ((user.points || 0) >= 100) awardBadge(user, "Centurion");
  if ((user.points || 0) >= 25) awardBadge(user, "Rising Star");
}

function recordDailyTask(user, taskType, { reward = false } = {}) {
  user.dailyChallenges = user.dailyChallenges || [];
  const key = dateKeyUTC();
  let entry = user.dailyChallenges.find((d) => d.dateKey === key);
  if (!entry) {
    entry = { dateKey: key, completedTasks: [], rewarded: false };
    user.dailyChallenges.push(entry);
  }
  entry.completedTasks = entry.completedTasks || [];
  if (!entry.completedTasks.includes(taskType)) entry.completedTasks.push(taskType);
  // Rewarding the daily challenge can be added later; for now points are awarded per action.
  if (reward) entry.rewarded = true;
}

async function addPoints(user, delta, { reason, dailyTaskType } = {}) {
  const inc = Number(delta);
  if (!Number.isFinite(inc) || inc === 0) return user;
  user.points = (user.points || 0) + inc;
  applyPointThresholdBadges(user);
  if (dailyTaskType) recordDailyTask(user, dailyTaskType, { reward: false });

  if (reason && user.notifications) {
    user.notifications.push({
      type: "gamification",
      message: `+${inc} points: ${reason}`,
      date: new Date(),
      read: false,
      meta: { delta: inc, reason },
    });
  }

  return user;
}

module.exports = { addPoints };

