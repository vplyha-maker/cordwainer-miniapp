export interface HeelCalculationParams {
  shoeSize: number;
  angleDeg: number;
  tToe: number;
  toeRoll: number;
}

export interface HeelCalculationResult {
  lastLength: number;
  effLength: number;
  netHeelHeight: number;
  totalHeelHeight: number;
  isMedicalWarning: boolean;
}

export function calculateHeelGeometry(params: HeelCalculationParams): HeelCalculationResult {
  const { shoeSize, angleDeg, tToe, toeRoll } = params;

  // 1. Длина следа колодки (штрихмасс, формула Paris Point)
  const lastLengthMm = (shoeSize * 6.67) + 12;
  
  // 2. Эффективная длина от пятки до пучков (73%)
  const lEff = lastLengthMm * 0.73;
  
  // 3. Перевод угла в радианы
  const angleRad = (angleDeg * Math.PI) / 180;
  
  // 4. Расчет чистой приподнятости пятки колодки
  const hHeel = lEff * Math.sin(angleRad);
  
  // 5. Итоговая физическая высота каблука для подошвы
  const hTotal = hHeel + tToe - (toeRoll * 0.2);

  // 6. Медицинский триггер ортопедической опасности
  const isMedicalWarning = angleDeg > 14 || hHeel > 40;

  return {
    lastLength: Math.round(lastLengthMm),
    effLength: Math.round(lEff),
    netHeelHeight: parseFloat(hHeel.toFixed(1)),
    totalHeelHeight: parseFloat(hTotal.toFixed(1)),
    isMedicalWarning
  };
}

