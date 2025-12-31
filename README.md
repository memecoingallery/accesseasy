# Solana Event Ticketing – Utility Payment Layer

A non-custodial, Solana-based payment interface for the event industry.  
The platform enables event hosts to generate ticket batches and collect fees using
community-driven utility tokens or stablecoins, with on-chain enforcement and GDPR-aware data handling.

This repository is designed to be deployed **exclusively via GitHub Pages** for the frontend,
with an **Anchor smart contract** included for fee enforcement.

---

## Core Principles

- **Non-custodial by design**  
  No private keys, seed phrases, or user funds are stored or controlled by the platform.

- **On-chain fee enforcement**  
  Ticket generation fees are validated and settled via a Solana smart contract.

- **Utility-token first**  
  Supports community utility tokens alongside stablecoins without fiat rails.

- **Static & auditable frontend**  
  Pure HTML/CSS/JS. No framework lock-in. No hidden backend.

- **GDPR-aware**  
  Minimal personal data collection (email only, optional).

---

## Supported Assets

### Utility Tokens
- **Night Watching Owl (NWO)**  
  SPL Token Mint: `HBpx1KCMhqsB5yKrZTqX747EPGTdfm8LJeUgNsbGpump`

- **DESPERADO (DESPERADO)**  
  SPL Token Mint: `FLdtFf57DbhPWZkz2HnEd4e9PRX7enFWQq7uPDDspump`

### Stablecoins
- **EURC**  
  SPL Token Mint: `HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr`

- **USDC**  
  SPL Token Mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

---

## Regional Payment Logic

| Host Location | Allowed Payment Assets |
|--------------|------------------------|
| North / Central / South America | DESPERADO, USDC |
| Rest of World | NWO, EURC |

This logic is enforced:
- Client-side (UI restrictions)
- On-chain (smart contract validation)

---

## Ticket Generation Fees (SOL Equivalent)

| Ticket Batch | Stablecoins | Utility Tokens |
|-------------|-------------|----------------|
| 100 tickets | 0.10 SOL | 0.049 SOL |
| 250 tickets | 0.20 SOL | 0.096 SOL |
| 500 tickets | 0.35 SOL | 0.15 SOL |

Fees are converted in real time using live SOL pricing
and transferred directly to the platform fee wallet:

