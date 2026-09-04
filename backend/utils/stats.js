function mean(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums) {
  if (nums.length < 2) return 0;
  const avg = mean(nums);
  const variance = mean(nums.map((n) => (n - avg) ** 2));
  return Math.sqrt(variance);
}

module.exports = { mean, stdDev };
