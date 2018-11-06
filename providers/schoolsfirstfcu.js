/* global $ */

module.exports = {
  name: 'SchoolsFirst FCU',
  async download(page, options) {
    await page.goto('https://m.schoolsfirstfcu.org/mb/index.html');

    // login
    await page.waitFor('#userAcctTxt');
    await page.waitFor('#userPassTxt');
    await page.waitFor('#loginBtn');
    await page.waitFor('.ui-loader', { hidden: true });
    await page.type('#userAcctTxt', options.username);
    await page.type('#userPassTxt', options.password);
    await page.click('#loginBtn');

    // get accounts
    await page.waitFor('#accountListView');
    await page.waitFor('.ui-loader', { hidden: true });
    const accounts = await page.evaluate(() => {
      return $('#accountListView a:has(> .sf-list-body)').map((index, el) => {
        return {
          id: $('.share-id', el).text(),
          type: $(el).closest('li').prevAll('[role="heading"]:first').text(),
          name: $('.sf-list-body', el).contents().filter((index, el) => {
            return el.nodeType == 3 && el.nodeValue.trim().length > 0;
          })[0].nodeValue.trim(),
          balance: $('.sf-balance', el).first().text(),
          index
        };
      }).get();
    });

    // get transactions for each account
    for (const account of accounts) {
      // click on account to bring up transactions
      await page.evaluate((i) => {
        $('#accountListView a:has(> .sf-list-body)').eq(i).click();
      }, account.index);

      // wait for transactions to load
      await page.waitFor('#accountHistoryListView');
      await page.waitFor('.ui-loader', { hidden: true });
      var clearedTransactions = await page.evaluate(() => {
        return $('#accountHistoryListView li[data-filtertext]').map(function(index, el) {
          return {
            id: el.id,
            date: $(el).prevAll('[role="heading"]:first').text(),
            description: $('.sf-description', el).text().trim(),
            status: 'cleared',
            amount: $('.sf-balance:not(.sf-available) span', el).text(),
            balance: $('.sf-available span', el).text()
          };
        }).get().reverse();
      });

      var hasPendingTab = await page.evaluate(() => {
        var pendAuthTabBtn = $('#pendAuthTabBtn,#cardAuthTabBtn');
        if (pendAuthTabBtn.length > 0) {
          pendAuthTabBtn.click();
          return true;
        }

        return false;
      });

      var pendingTransactions = [];
      if (hasPendingTab) {
        await page.waitFor('#pendingAuthView, #cardPendingView');
        await page.waitFor('.ui-loader', { hidden: true });
        pendingTransactions = await page.evaluate(() => {
          return $('#pendingAuthView li,#cardPendingView li').has('.sf-list-body').map(function(index, el) {
            var description = $('.sf-list-body:last', el).text();
            var category = null;

            var matches = description.match(/^(.+?) - (.+)$/);
            if (matches.length === 3) {
              description = matches[1];
              category = matches[2];
            }
            return {
              date: $('.sf-list-body:first', el).text(),
              description,
              category,
              status: 'pending',
              amount: $('.sf-list-right', el).text()
            };
          }).get();
        });
      }

      account.transactions = [...clearedTransactions, ...pendingTransactions].map((t, index) => {
        return { ...t, index };
      });

      if (account.index + 1 < accounts.length) {
        await page.evaluate(() => {
          $('#backBtn').click();
        });
        await page.waitFor('#accountListView');
        await page.waitFor('.ui-loader', { hidden: true });
      }
    }

    return { accounts };
  }
};
