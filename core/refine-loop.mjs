// core/refine-loop.mjs
// autoresearch keep/discard pattern for code quality improvement

export function shouldKeep(newScore, baselineScore) {
  return newScore > baselineScore;
}

export function generateFeedback(evaluation, previousAttempts = []) {
  const { storyId, score, grade, breakdown } = evaluation;
  const failedCriteria = Object.entries(breakdown)
    .filter(([_, v]) => v < 7)
    .map(([k, v]) => `${k}: ${v}/10`);

  let prompt = `Story ${storyId} quality: ${score}/100 (${grade}).\n`;
  if (failedCriteria.length > 0) {
    prompt += `Weak areas: ${failedCriteria.join(", ")}.\n`;
  }
  if (previousAttempts.length > 0) {
    prompt += `Previous attempts: ${previousAttempts.map(a => `attempt ${a.attempt}: ${a.score} (${a.status})`).join(", ")}.\n`;
  }
  prompt += `Improve the implementation. Focus on the weak areas. Try a different approach if the same strategy keeps failing.`;
  return prompt;
}

export function identifyRefinementTargets(evaluations, threshold = 80) {
  return evaluations
    .filter(e => e.score < threshold)
    .sort((a, b) => a.score - b.score);
}
