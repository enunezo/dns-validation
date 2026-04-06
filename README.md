# SSL Certificate POC — ssl.nunezlabs.com

This project demonstrates how to generate a free SSL certificate from Let's Encrypt using DNS-01 challenge validation, and serve HTTPS traffic with Express on AWS EC2.

---

## Stack

- **Node.js** + **Express** — HTTPS server
- **acme-client** — ACME protocol client (Let's Encrypt)
- **DNS-01 challenge** — manual TXT record validation via Cloudflare
- **AWS EC2** — server with Elastic IP
- **Cloudflare** — DNS provider (free tier, DNS only — no proxy)

---

## Project Structure

```
app/
├── index.js           # Express HTTPS server
├── generateCert.js    # Certificate generation using Greenlock (see note below)
├── generate-cert.js   # Certificate generation using acme-client (working solution)
├── dns-plugin.js      # Custom Greenlock DNS-01 plugin (manual TXT)
├── certs/             # Generated certificates (gitignored)
│   ├── fullchain.pem
│   └── privkey.pem
├── .env               # Environment variables (gitignored)
├── .gitignore
└── package.json
```

---

## Setup

### 1. Prerequisites

- Domain purchased and DNS delegated to Cloudflare
- Subdomain `ssl.nunezlabs.com` pointing to EC2 Elastic IP
- Node.js installed on EC2

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file:

```env
EMAIL=your@email.com
```

### 4. Generate SSL certificates

```bash
node generate-cert.js
```

When prompted, add the TXT record shown in the terminal to Cloudflare DNS:

```
Type:    TXT
Name:    _acme-challenge.ssl
Content: <value shown in terminal>
TTL:     60
```

Press **ENTER** after saving the record. The script waits 30 seconds for DNS propagation and then completes the validation.

Certificates are saved to `./certs/`:
- `./certs/privkey.pem`
- `./certs/fullchain.pem`

### 5. Start the HTTPS server

```bash
node index.js
```

Server runs on `https://ssl.nunezlabs.com` (port 443).

---

## Why Greenlock Was Not Used

The original plan was to use **Greenlock** (v3/v4) for certificate generation with a custom DNS-01 plugin. After extensive testing, Greenlock was found to be broken for manual DNS-01 validation due to a confirmed bug.

### The Bug

Greenlock performs a **Pre-Flight Dry Run** before requesting the real certificate. During this dry run, it internally generates **two different values** for the same challenge:

1. The value passed to your plugin via `set()` — the one you add to DNS
2. The value it uses to verify via `dig` — **a completely different value**

This means no matter what you put in DNS, Greenlock will always fail the dry run because it verifies a value it never gave you.

### Evidence

```
set() received:  test-08e6002f...p7FbXC0jbDv...   ← added to Cloudflare DNS
dig verified:    QxEnIwtIordMX8iUihI5U-bNCW3f...   ← different value, never provided
```

### Error

```
Error: Failed DNS-01 Pre-Flight Dry Run.
dig TXT '_greenlock-dryrun-xxxx.ssl.nunezlabs.com' does not return '<value>'
code: E_FAIL_DRY_CHALLENGE
```

### Root Cause

The bug lives in `@root/acme`, the internal dependency used by Greenlock. It is a known issue reported at:

> https://git.rootprojects.org/root/acme.js/issues/4

The Greenlock repository has had **no active maintenance for over 2 years**. The latest version (4.0.4) ships with this bug unfixed. Downgrading to v3 does not resolve the issue as both versions share the same broken `@root/acme` dependency.

### Conclusion

Greenlock was designed primarily for **HTTP-01 automatic validation** on web servers. Its support for **manual DNS-01 validation** is broken at the dependency level with no available fix from the maintainer.

The working solution uses **`acme-client`**, which implements the same ACME protocol used by Let's Encrypt, produces identical certificates, but does not have the dry run bug.

---

## Infrastructure Setup (Summary)

| Step | Details |
|------|---------|
| Domain registrar | OnlyDomains |
| DNS provider | Cloudflare (free, DNS only mode) |
| Nameservers | Delegated from OnlyDomains to Cloudflare |
| Certificate authority | Let's Encrypt (free) |
| Validation method | DNS-01 (manual TXT record) |
| Server | AWS EC2 (Ubuntu) with Elastic IP |
| HTTPS port | 443 |
