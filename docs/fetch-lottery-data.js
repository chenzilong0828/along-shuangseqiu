const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

async function fetchLotteryData() {
  try {
    // 使用500彩票网的数据源
    const url = 'https://datachart.500.com/ssq/history/newinc/history.php?start=00001&end=24034';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const historyData = [];

    $('tr.t_tr1, tr.t_tr2').each((index, element) => {
      const cells = $(element).find('td');
      if (cells.length >= 8) {
        const numbers = [
          parseInt($(cells[1]).text()), // 红球1
          parseInt($(cells[2]).text()), // 红球2
          parseInt($(cells[3]).text()), // 红球3
          parseInt($(cells[4]).text()), // 红球4
          parseInt($(cells[5]).text()), // 红球5
          parseInt($(cells[6]).text()), // 红球6
          parseInt($(cells[7]).text())  // 蓝球
        ];
        historyData.push(numbers);
      }
    });

    // 保存到JSON文件
    fs.writeFileSync('lottery-data.json', JSON.stringify({ historyData }, null, 2));
    console.log(`成功获取 ${historyData.length} 期开奖数据`);
  } catch (error) {
    console.error('获取数据失败:', error);
  }
}

fetchLotteryData(); 