#!/usr/bin/env node
// Utility script to discover Omada Controller ID and Site IDs
const axios = require('axios');
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function discoverOmadaIds() {
  console.log('=== Omada Controller ID Discovery Tool ===\n');

  // Get Omada URL
  const omadaUrl = (await question('Enter your Omada Controller URL (e.g., https://192.168.1.1:8043): ')).trim();
  if (!omadaUrl) {
    console.error('Error: Omada URL is required');
    rl.close();
    return;
  }

  // Get credentials
  const clientId = (await question('Enter your Open API Client ID: ')).trim();
  const clientSecret = (await question('Enter your Open API Client Secret: ')).trim();

  if (!clientId || !clientSecret) {
    console.error('Error: Client ID and Secret are required');
    rl.close();
    return;
  }

  console.log('\nAttempting to discover controller ID...\n');

  const client = axios.create({
    baseURL: omadaUrl,
    timeout: 20000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Try to get controller info
  try {
    // Method 1: Try the /api/info endpoint (works on some controllers)
    try {
      const infoResp = await client.get('/api/info');
      if (infoResp.data?.omadacId) {
        console.log('✓ Found Controller ID from /api/info endpoint');
        console.log(`  OMADA_OPENAPI_OMADAC_ID = ${infoResp.data.omadacId}\n`);
      }
    } catch (e) {
      console.log('  /api/info endpoint not available (this is normal)');
    }

    // Method 2: Try different common controller IDs
    console.log('\nTrying common controller ID patterns...\n');

    // Common patterns for controller IDs
    const commonIds = [
      clientId.split('-')[0], // First part of client ID
      clientId, // Sometimes the client ID itself
      'omada',
      'controller',
      '1',
      'default',
    ].filter((id, index, self) => id && self.indexOf(id) === index); // Remove duplicates and empty values

    // Add option for manual entry
    const manualId = await question('Enter controller ID to try manually (or press Enter to use auto-discovery): ');
    if (manualId.trim()) {
      commonIds.unshift(manualId.trim());
    }

    for (const testId of commonIds) {
      if (!testId) continue;

      try {
        console.log(`Testing controller ID: ${testId}`);

        const tokenResp = await client.post('/openapi/authorize/token?grant_type=client_credentials', {
          omadacId: testId,
          client_id: clientId,
          client_secret: clientSecret,
        });

        if (tokenResp.data?.errorCode === 0 && tokenResp.data?.result?.accessToken) {
          console.log(`\n✓ SUCCESS! Found valid controller ID: ${testId}\n`);

          const token = tokenResp.data.result.accessToken;

          // Now try to get sites
          console.log('Fetching available sites...\n');

          try {
            // Try v1 API
            const sitesResp = await client.get(`/openapi/v1/${testId}/sites`, {
              headers: {
                Authorization: `AccessToken=${token}`,
              },
            });

            if (sitesResp.data?.errorCode === 0 && sitesResp.data?.result) {
              const sites = Array.isArray(sitesResp.data.result) ? sitesResp.data.result : [];
              console.log(`Found ${sites.length} site(s):\n`);

              sites.forEach((site, index) => {
                console.log(`Site ${index + 1}:`);
                console.log(`  Name: ${site.name || 'N/A'}`);
                console.log(`  ID: ${site.id || site.siteId || 'N/A'}`);
                console.log(`  Type: ${site.type || 'N/A'}\n`);
              });

              console.log('\n=== Configuration Summary ===\n');
              console.log('Add these to your .env file or Docker environment:\n');
              console.log(`OMADA_URL=${omadaUrl}`);
              console.log(`OMADA_OPENAPI_OMADAC_ID=${testId}`);
              console.log(`OMADA_OPENAPI_CLIENT_ID=${clientId}`);
              console.log(`OMADA_OPENAPI_CLIENT_SECRET=${clientSecret}`);

              if (sites.length > 0) {
                const firstSite = sites[0];
                const siteId = firstSite.id || firstSite.siteId || '';
                console.log(`OMADA_SITE_ID=${siteId}`);

                if (sites.length > 1) {
                  console.log('\n# Other available sites:');
                  sites.slice(1).forEach((site) => {
                    console.log(`# OMADA_SITE_ID=${site.id || site.siteId} # ${site.name}`);
                  });
                }
              }

              console.log('\n');
              rl.close();
              return;
            }
          } catch (siteErr) {
            console.log(`  Could not fetch sites: ${siteErr.message}`);
          }

          // Even if we can't get sites, the controller ID is valid
          console.log('\n=== Configuration Summary ===\n');
          console.log('Add these to your .env file or Docker environment:\n');
          console.log(`OMADA_URL=${omadaUrl}`);
          console.log(`OMADA_OPENAPI_OMADAC_ID=${testId}`);
          console.log(`OMADA_OPENAPI_CLIENT_ID=${clientId}`);
          console.log(`OMADA_OPENAPI_CLIENT_SECRET=${clientSecret}`);
          console.log('# OMADA_SITE_ID will be auto-discovered if not set\n');

          rl.close();
          return;
        }
      } catch (e) {
        if (e.response?.data?.msg) {
          console.log(`  Failed: ${e.response.data.msg}`);
        } else if (e.message) {
          console.log(`  Failed: ${e.message}`);
        }
      }
    }

    console.log('\n⚠ Could not automatically discover controller ID.');
    console.log('\nPlease check:');
    console.log('1. Your Omada Controller web UI > Settings > Open API');
    console.log('2. Verify the Client ID and Secret are correct');
    console.log('3. Look for the "Controller ID" or "Omada ID" in the Open API settings');
    console.log('4. Some controllers use the hostname or IP as the controller ID\n');

  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
  }

  rl.close();
}

discoverOmadaIds().catch((err) => {
  console.error('Fatal error:', err);
  rl.close();
  process.exit(1);
});
