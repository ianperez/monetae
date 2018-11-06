const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = {
  providers(providersPath) {
    return new Promise((resolve, reject) => {
      fs.readdir(providersPath, (err, items) => {
        if (err) {
          reject(err);
        } else {
          resolve(items.reduce((items, p) => {
            var filePath = path.resolve(providersPath, p);
            var basename = path.basename(p, '.js');
            var hash = crypto.createHash('sha256')
              .update(fs.readFileSync(filePath))
              .digest('hex');
            items[basename] = {
              hash,
              ...require(filePath)
            };
            return items;
          }, {}));
        }
      });
    });
  }
};
