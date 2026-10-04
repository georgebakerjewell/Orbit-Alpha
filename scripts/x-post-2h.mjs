#!/usr/bin/env node
/**
 * X (Twitter) posting for 2-hour market updates
 * Posts top movers during US market hours
 */

import crypto from 'crypto';
import { URLSearchParams } from 'url';

const API_KEY = process.env.X_API_KEY;
const API_SECRET = process.env.X_API_SECRET;
const ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const ACCESS_SECRET = process.env.X_ACCESS_SECRET;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_SECRET) {
  console.error('Missing X API credentials');
  process.exit(1);
}

async function fetchData() {
  const res = await fetch('https://www.orbitalpha.cloud/api/quotes');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const { quotes } = await res.json();
  return quotes;
}

function generateOAuthSignature(method, url, params, accessSecret) {
  const baseString = [
    method,
    encodeURIComponent(url),
    encodeURIComponent(
      Object.entries(params)
        .sort()
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')
    ),
  ].join('&');

  const signingKey = `${encodeURIComponent(API_SECRET)}&${encodeURIComponent(accessSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function buildOAuthHeader(method, url, params, accessSecret) {
  const signature = generateOAuthSignature(method, url, params, accessSecret);
  const oauthParams = {
    oauth_consumer_key: API_KEY,
    oauth signature: signature,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  return (
    'OAuth ' +
    Object.entries(oauthParams)
      .map(([k, v]) => `${k}="${encodeURIComponent(v)}"`)
      .join(',')
  );
}

async function postToX(text) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text });

  const params = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature('POST', url, params, ACCESS_SECRET);
  const oauthHeader =
    'OAuth ' +
    Object.entries({ ...params, oauth_signature: signature })
      .map(([k, v]) => `${k}="${encodeURIComponent(v)}"`)
      .join(', ');

  if (DRY_RUN) {
    console.log('📤 DRY RUN - Would post to X:');
    console.log(text);
    console.log('\nOAuth header (truncated):', oauthHeader.substring(0, 50) + '...');
    return { id: 'dry-run-123' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: oauthHeader,
      'Content-Type': 'application/json',
      'User-Agent': 'Orbit-Alpha/1.0',
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X API error ${res.status}: ${err}`);
  }

  return res.json();
}

async function main() {
  try {
    console.log('📊 Fetching market data...');
    const quotes = await fetchData();

    // Get top 5 gainers and losers
    const entries = Object.entries(quotes)
      .filter(([_, q]) => typeof q?.changePct === 'number')
      .sort((a, b) => b[1].changePct - a[1].changePct);

    const topGainers = entries.slice(0, 3);
    const topLosers = entries.slice(-3).reverse();

    let text = '🚀 Space stocks live update\n\n';
    text += '📈 Top gainers:\n';
    topGainers.forEach(([ticker, q]) => {
      text += `$${ticker} +${q.changePct.toFixed(2)}% (${q.price})\n`;
    });

    text += '\n📉 Top losers:\n';
    topLosers.forEach(([ticker, q]) => {
      text += `$${ticker} ${q.changePct.toFixed(2)}% (${q.price})\n`;
    });

    text += '\nLive: orbitalpha.cloud/markets';

    console.log('📝 Posting...');
    const result = await postToX(text);
    console.log('✅ Posted:', result.data?.id || result.id);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
