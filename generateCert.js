require('dotenv').config();
const acme = require('acme-client');
const fs = require('fs');
const readline = require('readline');

const DOMAIN = 'ssl.nunezlabs.com';
const EMAIL = process.env.EMAIL;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const waitForEnter = (msg) => new Promise(resolve => rl.question(msg, () => resolve()));

async function main() {
  if (!fs.existsSync('./certs')) fs.mkdirSync('./certs');

  const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.production,
    accountKey: await acme.crypto.createPrivateKey(),
  });

  await client.createAccount({
    termsOfServiceAgreed: true,
    contact: [`mailto:${EMAIL}`],
  });
  console.log('✅ ACME account created');

  const [key, csr] = await acme.crypto.createCsr({ commonName: DOMAIN });
  console.log('✅ CSR created');

  const cert = await client.auto({
    csr,
    email: EMAIL,
    termsOfServiceAgreed: true,
    challengePriority: ['dns-01'],
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
      console.log('\n==========================================');
      console.log('Add this TXT record in Cloudflare:');
      console.log('==========================================');
      console.log(`  Type:    TXT`);
      console.log(`  Name:    _acme-challenge.ssl`);
      console.log(`  Content: ${keyAuthorization}`);
      console.log(`  TTL:     60`);
      console.log('==========================================\n');
      await waitForEnter('Press ENTER when DNS record is saved...');
      console.log('⏳ Waiting 30s for DNS propagation...');
      await new Promise(r => setTimeout(r, 30000));
      console.log('✅ Continuing...\n');
    },
    challengeRemoveFn: async () => {
      console.log('🗑️  You can now delete the TXT record _acme-challenge.ssl');
      rl.close();
    },
  });

  fs.writeFileSync('./certs/privkey.pem', key.toString());
  fs.writeFileSync('./certs/fullchain.pem', cert.toString());

  console.log('\n🎉 Certificates saved to ./certs/');
}

main().catch(err => { console.error(err); rl.close(); });
