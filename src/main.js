const fs = require('fs');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const ignoreImgLoad = require('../lib/request/ignoreImgLoad');
const config = {
  isHeadless: true, // 頁面開啟與否
};

(async () => {
  const browser = await puppeteer.launch({
    headless: config.isHeadless,
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

  while (count < 26) {
    let url =
      'https://www.basketball-reference.com/players/' +
      String.fromCharCode(97 + count);
    await page.goto(url);
    let body = await page.content();
    let $ = cheerio.load(body);
    let links = [];

    $('#players tbody tr').each((i, element) => {
      let link = $(element).find('a').attr('href');
      if (link !== undefined) links.push(link);
    });

    for (let index = 0; index < links.length; index++) {
      let element = links[index];
      let target = `https://www.basketball-reference.com${element}`;
      await playerPage.goto(target);
      let infoBody = await playerPage.content();
      let $content = cheerio.load(infoBody);
      let info = {
        name: $content('#info.players h1[itemprop="name"] span').html(),
        games: $content('.poptip[data-tip="Games"]').next().next().html(),
        points: $content('.poptip[data-tip="Points"]').next().next().html(),
        totalRebounds: $content('.poptip[data-tip="Total Rebounds"]')
          .next()
          .next()
          .html(),
        assists: $content('.poptip[data-tip="Assists"]').next().next().html(),
        fieldGoalPercentage: $content(
          '.poptip[data-tip="Field Goal Percentage"]'
        )
          .next()
          .next()
          .html(),
        fieldGoalPercentageOf3Point: $content(
          '.poptip[data-tip="3-Point Field Goal Percentage"]'
        )
          .next()
          .next()
          .html(),
        freeThrowPercentage: $content(
          '.poptip[data-tip="Free Throw Percentage"]'
        )
          .next()
          .next()
          .html(),
        effectiveFieldGoalPercentage: $content(
          '#info > div.stats_pullout > div.p2 > div:nth-child(4) > h4'
        )
          .next()
          .next()
          .html(),
        playerEfficiencyRating: $content(
          '#info > div.stats_pullout > div.p3 > div:nth-child(1) > h4'
        )
          .next()
          .next()
          .html(),
        winShares: $content(
          '#info > div.stats_pullout > div.p3 > div:nth-child(2) > h4'
        )
          .next()
          .next()
          .html(),
        tag: {}, // 11
      };

      // console.table(info);

      [firstName, lastName] = info.name.split(' ');
      info.tag = {firstName, lastName};

      // console.table(info.tag);

      if (info.tag.firstName.charCodeAt(0) > 90) {
        switch (info.tag.firstName.charCodeAt(0)) {
          case 193:
            info.tag.firstName = info.tag.firstName.replace(/Á/g, 'A');
            data[info.tag.firstName.charCodeAt(0) - 65].push(info);
            continue;
          case 211:
            info.tag.firstName = info.tag.firstName.replace(/Ó/g, 'O');
            data[info.tag.firstName.charCodeAt(0) - 65].push(info);
            continue;
          case 214:
            info.tag.firstName = info.tag.firstName.replace(/Ö/g, 'O');
            data[info.tag.firstName.charCodeAt(0) - 65].push(info);
            continue;
          case 352:
            info.tag.firstName = info.tag.firstName.replace(/Š/g, 'S');
            data[info.tag.firstName.charCodeAt(0) - 65].push(info);
            continue;
          case 381:
            info.tag.firstName = info.tag.firstName.replace(/Ž/g, 'Z');
            data[info.tag.firstName.charCodeAt(0) - 65].push(info);
            continue;
        }
      } else {
        data[info.tag.firstName.charCodeAt(0) - 65].push(info);
      }
    }
    count++;
  }

  for (let index = 0; index < data.length; index++) {
    data[index].sort((a, b) =>
      a.firstName > b.firstName ? 1 : a.firstName < b.firstName ? -1 : 0
    );
  }

  // data.forEach((d) => {
  //   console.table(d);
  // });

  for (let capital = 0; capital < data.length; capital++) {
    let csv = 'Player,G,PTS,TRB,AST,FG(%),FG3(%),FT(%),eFG(%),PER,WS\n';
    data[capital].forEach((d) => {
      for (let prop in d) {
        if (prop !== 'tag') csv += d[prop];
        if (prop !== 'winShares' && prop !== 'tag') csv += ',';
        else if (prop === 'tag') csv += '\n';
      }
    });

    // console.log(csv);

    fs.promises.mkdir(`../output/`, {recursive: true}).then(() => {
      fs.promises
        .writeFile(`../output/${String.fromCharCode(capital + 65)}.csv`, csv)
        .then(() => {
          console.log(
            `Save as output/${String.fromCharCode(capital + 65)}.csv`
          );
        });
    });
  }

  browser.close();
})();
