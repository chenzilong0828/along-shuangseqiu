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
    return [];
  }
}

function showStats() {
  // 获取历史数据
  const historyData = JSON.parse(localStorage.getItem('predictionHistory') || '[]');

  // 如果没有历史数据
  if (historyData.length === 0) {
    document.getElementById('stats').innerHTML = '<p>暂无预测历史数据</p>';
    return;
  }

  // 统计红球和蓝球出现的频率
  const redBallStats = {};
  const blueBallStats = {};

  historyData.forEach(prediction => {
    prediction.redBalls.forEach(num => {
      redBallStats[num] = (redBallStats[num] || 0) + 1;
    });
    blueBallStats[prediction.blueBall] = (blueBallStats[prediction.blueBall] || 0) + 1;
  });

  // 生成统计信息的HTML
  let statsHTML = `
      <h3>统计信息</h3>
      <p>共生成 ${historyData.length} 组预测号码</p>
      <div>
          <h4>红球出现频率：</h4>
          <p>${Object.entries(redBallStats)
      .sort((a, b) => b[1] - a[1])
      .map(([num, count]) => `${num}号：${count}次`)
      .join('， ')}
          </p>
          <h4>蓝球出现频率：</h4>
          <p>${Object.entries(blueBallStats)
      .sort((a, b) => b[1] - a[1])
      .map(([num, count]) => `${num}号：${count}次`)
      .join('， ')}
          </p>
      </div>
  `;

  document.getElementById('stats').innerHTML = statsHTML;
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
  const predictions = []; // 存储本次生成的所有预测

  for (let i = 0; i < count; i++) {
    // 第一组使用随机预测，后续组基于前一组预测
    const prediction = i === 0 ? predictRandom() : predictNextNumbers(
      [...lastPrediction.red, lastPrediction.blue]
    );
    lastPrediction = prediction;

    // 保存预测结果
    predictions.push({
      redBalls: prediction.red,
      blueBall: prediction.blue,
      timestamp: new Date().getTime()
    });

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

  // 保存到 localStorage
  const existingPredictions = JSON.parse(localStorage.getItem('predictions') || '[]');
  localStorage.setItem('predictions', JSON.stringify([...existingPredictions, ...predictions]));
}

// 显示统计信息
function showStats() {
  // 获取统计区域元素
  const statsDiv = document.querySelector('.stats');
  const statsContent = document.getElementById('stats');

  // 切换显示状态
  if (statsDiv.style.display === 'none' || !statsDiv.style.display) {
    statsDiv.style.display = 'block';

    // 清空现有内容
    statsContent.innerHTML = '';

    // 生成统计信息
    const stats = calculateStats();
    displayStats(stats, statsContent);
  } else {
    statsDiv.style.display = 'none';
  }
}

function calculateStats() {
  const predictions = JSON.parse(localStorage.getItem('predictions') || '[]');

  // 初始化统计对象
  const stats = {
    redBalls: Array(33).fill(0),
    blueBalls: Array(16).fill(0),
    oddEvenRatio: { odd: 0, even: 0 },
    sumRange: { min: 0, max: 0, avg: 0 }
  };

  if (predictions.length === 0) {
    return stats;
  }

  let totalSum = 0;

  predictions.forEach(pred => {
    // 统计红球
    pred.redBalls.forEach(num => {
      stats.redBalls[num - 1]++;
      if (num % 2 === 0) {
        stats.oddEvenRatio.even++;
      } else {
        stats.oddEvenRatio.odd++;
      }
    });

    // 统计蓝球
    stats.blueBalls[pred.blueBall - 1]++;

    // 计算当前预测的红球和值
    const sum = pred.redBalls.reduce((a, b) => a + b, 0);
    totalSum += sum;

    // 更新最大最小值
    if (stats.sumRange.min === 0 || sum < stats.sumRange.min) {
      stats.sumRange.min = sum;
    }
    if (sum > stats.sumRange.max) {
      stats.sumRange.max = sum;
    }
  });

  // 计算平均值
  stats.sumRange.avg = totalSum / predictions.length;

  return stats;
}

function displayStats(stats, container) {
  // 显示红球频率
  const redBallsStats = document.createElement('div');
  redBallsStats.className = 'stat-item';
  redBallsStats.innerHTML = `
    <h3>红球出现频率</h3>
    <p>${stats.redBalls.map((count, index) =>
    `${index + 1}号：${count}次`).join(' | ')}</p>
  `;
  container.appendChild(redBallsStats);

  // 显示蓝球频率
  const blueBallsStats = document.createElement('div');
  blueBallsStats.className = 'stat-item';
  blueBallsStats.innerHTML = `
    <h3>蓝球出现频率</h3>
    <p>${stats.blueBalls.map((count, index) =>
    `${index + 1}号：${count}次`).join(' | ')}</p>
  `;
  container.appendChild(blueBallsStats);

  // 显示奇偶比例
  const oddEvenStats = document.createElement('div');
  oddEvenStats.className = 'stat-item';
  oddEvenStats.innerHTML = `
    <h3>奇偶比例</h3>
    <p>奇数：${stats.oddEvenRatio.odd} | 偶数：${stats.oddEvenRatio.even}</p>
  `;
  container.appendChild(oddEvenStats);

  // 显示和值范围
  const sumStats = document.createElement('div');
  sumStats.className = 'stat-item';
  sumStats.innerHTML = `
    <h3>红球和值统计</h3>
    <p>最小值：${stats.sumRange.min}</p>
    <p>最大值：${stats.sumRange.max}</p>
    <p>平均值：${stats.sumRange.avg.toFixed(2)}</p>
  `;
  container.appendChild(sumStats);
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