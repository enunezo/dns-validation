'use strict';

const stored = {};

module.exports.create = function() {
  return {
    init: function() { return Promise.resolve(); },
    zones: function() { return Promise.resolve(['nunezlabs.com']); },
    set: function({ challenge }) {
      const { dnsHost, keyAuthorization } = challenge;

      // Guardar el valor para que get() lo devuelva
      stored[dnsHost] = keyAuthorization;

      console.log('\n\n==== SET CALLED ====');
      console.log('==========================================');
      console.log('Add this TXT record in Cloudflare:');
      console.log('==========================================');
      console.log(`  Type:    TXT`);
      console.log(`  Name:    ${dnsHost}`);
      console.log(`  Content: ${keyAuthorization}`);
      console.log(`  TTL:     60`);
      console.log('==========================================\n');

      return new Promise((resolve) => {
        process.stdout.write('Press ENTER when DNS record is saved in Cloudflare...');
        process.stdin.resume();
        process.stdin.once('data', async () => {
          process.stdin.pause();
          console.log('⏳ Waiting 60s for DNS propagation...');
          await new Promise(r => setTimeout(r, 60000));
          console.log('✅ Continuing...\n');
          resolve();
        });
      });
    },
    get: function({ challenge }) {
      const { dnsHost } = challenge;
      const keyAuthorization = stored[dnsHost];
      console.log(`\n[GET] dnsHost: ${dnsHost} → ${keyAuthorization}`);
      if (keyAuthorization) {
        return Promise.resolve({ keyAuthorization });
      }
      return Promise.resolve(null);
    },
    remove: function({ challenge }) {
      delete stored[challenge.dnsHost];
      console.log(`\n🗑️  You can now delete: ${challenge.dnsHost}`);
      return Promise.resolve();
    },
  };
};
