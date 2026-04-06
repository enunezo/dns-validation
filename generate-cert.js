require('dotenv').config();
const Greenlock = require('greenlock');
const path = require('path');

const gl = Greenlock.create({
  packageRoot: __dirname,
  configDir: './greenlock.d',
  maintainerEmail: process.env.EMAIL,
  subscriberEmail: process.env.EMAIL,
  agreeToTerms: true,
  cluster: false,
});

gl.add({
  subject: 'ssl.nunezlabs.com',
  altnames: ['ssl.nunezlabs.com'],
  challenges: {
    'dns-01': {
      module: path.join(__dirname, 'dns-plugin.js'),
    },
  },
}).then(() => {
  return gl.renew({}, { subject: 'ssl.nunezlabs.com' });
}).then((results) => {
  console.log('\n🎉 Certs generated!');
  console.log(JSON.stringify(results, null, 2));
}).catch(console.error);
