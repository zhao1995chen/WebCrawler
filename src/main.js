const fs = require('fs');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const ignoreImgLoad = require('../lib/request/ignoreImgLoad');

(async () => {
  const browser = await puppeteer.launch({
    headless: false
  });
  const page = await browser.newPage();
  const playerPage = await browser.newPage();
  await playerPage.setRequestInterception(true);
  playerPage.on('request', ignoreImgLoad);
  let data = new Array();
  for (let index = 0; index < 26; index++) {
    data[index] = new Array();
  }
  let count = 0;

  while(count < 26) {
    let url = 'https://www.basketball-reference.com/players/'+ String.fromCharCode(97+count);
    await page.goto(url);
    let body = await page.content();
    let $ = cheerio.load(body);
    let links = [];

    $('#players tbody tr').each((i, element) => {
      let link = $(element).find('a').attr('href');
      if(link !== undefined) {
        links.push(link);
      }
    });

    for (let index = 0; index < links.length; index++) {
      let element = links[index];
      let target = `https://www.basketball-reference.com${element}`;
      await playerPage.goto(target);
      let infoBody = await playerPage.content();
      let $2 = cheerio.load(infoBody);
      let info = [
        name = $2('h1[itemprop="name"]').text(),
        games = $2('.poptip[data-tip="Games"]').next().next().html(),
        points = $2('.poptip[data-tip="Points"]').next().next().html(),
        totalRebounds = $2('.poptip[data-tip="Total Rebounds"]').next().next().html(),
        assists = $2('.poptip[data-tip="Assists"]').next().next().html(),
        fieldGoalPercentage = $2('.poptip[data-tip="Field Goal Percentage"]').next().next().html(),
        fieldGoalPercentageOf3Point = $2('.poptip[data-tip="3-Point Field Goal Percentage"]').next().next().html(),
        freeThrowPercentage = $2('.poptip[data-tip="Free Throw Percentage"]').next().next().html(),
        effectiveFieldGoalPercentage = $2('#info > div.stats_pullout > div.p2 > div:nth-child(4) > h4').next().next().html(),
        playerEfficiencyRating = $2('#info > div.stats_pullout > div.p3 > div:nth-child(1) > h4').next().next().html(),
        winShares = $2('#info > div.stats_pullout > div.p3 > div:nth-child(2) > h4').next().next().html(),
        tag = new String() // 11
      ]
      info[11]= $2('h1[itemprop="name"]').text().split(" ")[0];
      if(info[11].charCodeAt(0) > 90) {
        switch(info[11].charCodeAt(0)) {
          case 193:
            info[11] = info[11].replace(/Á/g, "A");
            data[(info[11].charCodeAt(0)-65)].push(info);
            continue;
          case 211:
            info[11] = info[11].replace(/Ó/g, "O");
            data[(info[11].charCodeAt(0)-65)].push(info);
            continue;
          case 214:
            info[11] = info[11].replace(/Ö/g, "O");
            data[(info[11].charCodeAt(0)-65)].push(info);
            continue;
          case 352:
            info[11] = info[11].replace(/Š/g, "S");
            data[(info[11].charCodeAt(0)-65)].push(info);
            continue;
          case 381:
            info[11] = info[11].replace(/Ž/g, "Z");
            data[(info[11].charCodeAt(0)-65)].push(info);
            continue;
        }
      } else {
        data[(info[11].charCodeAt(0)-65)].push(info);
      }
    }
    count++;
  }

  for (let index = 0; index < data.length; index++) {
    data[index].sort((a,b) => {
      let firstNameA = a[11];
      let firstNameB = b[11];
      if(firstNameA < firstNameB) return -1;
      if(firstNameA > firstNameB) return 1;
      return 0;
    });
  }

  for (let capital = 0; capital < data.length; capital++) {
    let csv = 'Player,G,PTS,TRB,AST,FG(%),FG3(%),FT(%),eFG(%),PER,WS\n';
    for(let index = 0; index < data[capital].length; index++) {
      for(let prop = 0; prop < data[capital][index].length - 1; prop++) {
        let cellVal = data[capital][index][prop];
        csv += cellVal;
        if(prop < data[capital][index].length - 2) {
          csv += ",";
        }
      }
      if(index < data[capital].length - 1) {
        csv += "\n";
      }
    }
    fs.promises
      .mkdir(`../output/`, { recursive: true })
      .then(() => {
        fs.promises
          .writeFile(`../output/${String.fromCharCode(capital+65)}.csv`, csv)
          .then(() => {
            console.log(`Save as output/${String.fromCharCode(capital+65)}.csv`);
          })
      })
  }

  browser.close();
})();