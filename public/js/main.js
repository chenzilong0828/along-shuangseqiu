// 加载历史数据
async function loadHistoryData() {
  try {
    const response = await fetch('/along-shuangseqiu/lottery-data.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('成功加载历史数据:', data); // 添加日志
    return data.historyData;
  } catch (error) {
    console.error('加载历史数据失败:', error);
    // 如果加载失败，返回一些示例数据
    return [
      [2, 9, 12, 19, 21, 31, 4],
      [6, 10, 11, 18, 20, 32, 5],
      [1, 3, 4, 11, 12, 21, 16],
      // ... 可以添加更多示例数据
    ];
  }
}

// 准备训练数据
function prepareTrainingData(historyData) {
  const trainingData = [];

  // 使用前一期号码预测下一期
  for (let i = 0; i < historyData.length - 1; i++) {
    // 将号码归一化到 0-1 范围
    const input = historyData[i].map(num => num / 33); // 所有号码除以33进行归一化
    const output = historyData[i + 1].map(num => num / 33);

    trainingData.push({
      input: input,
      output: output
    });
  }

  return trainingData;
}

// 初始化并训练神经网络
async function initializeNetwork() {
  const historyData = await loadHistoryData();
  if (historyData.length === 0) return null;

  const trainingData = prepareTrainingData(historyData);

  // 初始化神经网络
  const net = new brain.NeuralNetwork({
    hiddenLayers: [14, 14], // 两个隐藏层，每层14个神经元
    activation: 'sigmoid'    // 使用sigmoid激活函数
  });

  // 训练网络
  console.log('开始训练神经网络...');
  net.train(trainingData, {
    iterations: 2000,    // 训练迭代次数
    errorThresh: 0.005,  // 误差阈值
    log: true,          // 显示训练日志
    logPeriod: 100      // 每100次迭代显示一次日志
  });
  console.log('神经网络训练完成');

  return net;
}

// 生成随机号码的函数
function generateRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let trainedNetwork = null;

// 初始化网络
(async function () {
  trainedNetwork = await initializeNetwork();
})();

// 使用神经网络预测下一期号码
function predictNextNumbers(lastNumbers) {
  if (!trainedNetwork) {
    return predictRandom();
  }

  // 归一化输入数据
  const normalizedInput = lastNumbers.map(num => num / 33);

  // 使用神经网络进行预测
  const normalizedOutput = trainedNetwork.run(normalizedInput);

  // 将预测结果转换回实际号码
  const redBalls = normalizedOutput.slice(0, 6).map(prob =>
    Math.max(1, Math.min(33, Math.round(prob * 33)))
  );

  // 确保红球不重复
  const uniqueRedBalls = new Set(redBalls);
  while (uniqueRedBalls.size < 6) {
    uniqueRedBalls.add(generateRandomNumber(1, 33));
  }

  // 生成蓝球
  const blueBall = Math.max(1, Math.min(16, Math.round(normalizedOutput[6] * 16)));

  return {
    red: Array.from(uniqueRedBalls).slice(0, 6).sort((a, b) => a - b),
    blue: blueBall
  };
}

// 生成随机预测
function predictRandom() {
  let redBalls = new Set();
  while (redBalls.size < 6) {
    redBalls.add(generateRandomNumber(1, 33));
  }
  return {
    red: Array.from(redBalls).sort((a, b) => a - b),
    blue: generateRandomNumber(1, 16)
  };
}

// 生成多组预测号码
function predictMultiple(count) {
  const predictionsDiv = document.getElementById('predictions');
  predictionsDiv.innerHTML = '';

  let lastPrediction = null;
  for (let i = 0; i < count; i++) {
    // 第一组使用随机预测，后续组基于前一组预测
    const prediction = i === 0 ? predictRandom() : predictNextNumbers(
      [...lastPrediction.red, lastPrediction.blue]
    );
    lastPrediction = prediction;

    const predictionGroup = document.createElement('div');
    predictionGroup.className = 'prediction-group';

    const label = document.createElement('div');
    label.className = 'prediction-label';
    label.textContent = `第 ${i + 1} 组预测号码：`;

    const numbers = document.createElement('div');
    numbers.className = 'numbers';

    const redBallsDiv = document.createElement('div');
    redBallsDiv.className = 'red-balls';
    prediction.red.forEach(num => {
      const ball = document.createElement('div');
      ball.className = 'ball red';
      ball.textContent = num.toString().padStart(2, '0');
      redBallsDiv.appendChild(ball);
    });

    const blueBallDiv = document.createElement('div');
    blueBallDiv.className = 'blue-ball';
    const blueBall = document.createElement('div');
    blueBall.className = 'ball blue';
    blueBall.textContent = prediction.blue.toString().padStart(2, '0');
    blueBallDiv.appendChild(blueBall);

    numbers.appendChild(redBallsDiv);
    numbers.appendChild(blueBallDiv);
    predictionGroup.appendChild(label);
    predictionGroup.appendChild(numbers);
    predictionsDiv.appendChild(predictionGroup);
  }
}

// 显示统计信息
function showStats() {
  const statsDiv = document.getElementById('stats');
  statsDiv.innerHTML = '统计信息将在这里显示';
  // 这里可以添加更详细的统计信息
}

// 显示当前时间
function updateTime() {
  const timeDisplay = document.getElementById('currentTime');
  const now = new Date();
  timeDisplay.textContent = now.toLocaleString('zh-CN');
}

// 每秒更新时间
setInterval(updateTime, 1000);
updateTime(); // 立即显示时间