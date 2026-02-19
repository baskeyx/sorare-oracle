const getPredictedScore = async (
  averageScore5: number,
  averageScore15: number,
  averageScore10Played: number,
  percentage: number,
) => {
  const w15 = 0.55;
  const w10 = 0.35;
  const w5 = 0.1;

  const algoInput = Math.round(
    averageScore15 * w15 + averageScore10Played * w10 + averageScore5 * w5,
  );

  const predictedScore = Math.round(
    percentage > 0 ? ((percentage - 50) / 100 + 1) * algoInput : 0,
  );

  return predictedScore > 100 ? 100 : predictedScore;
};

export default getPredictedScore;
