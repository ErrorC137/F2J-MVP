**Free to Joy - XRPL Hackathon 2025**

**Overview**

Free to Joy transforms volunteered time into tradable tokens on the XRP Ledger (XRPL). This platform enables organizations to incentivize social responsibility through blockchain-verified contributions, creating a transparent ecosystem for volunteerism and charitable giving.
Key Features

    XRPL-based token issuance (F2J currency)

    Volunteer hour validation via XRPL Hooks

    Real-time transaction tracking on XRPL ledger

    Token redemption system compatible with XRPL DEX

    Testnet-ready architecture

**XRPL Implementation**

Core Components

    Token Standard: XLS-14 compliant issued currency

    Consensus: XRPL RPCA protocol (3-5 second finality)

    Transaction Types: Payment, TrustSet, OfferCreate

    Network: XRPL Testnet/Mainnet compatibility

Technical Flow

    1.Volunteer submits proof through web interface

    2.Validation Hook triggers on XRPL

    3.Successful verification mints F2J tokens

    4.Tokens stored in Xumm-compatible wallets

    5.Redemption burns tokens via XRPL transactions

Technologies Used

    Blockchain: XRPL (XRP Ledger)

    Libraries: xrpl.js v2.7, Xumm SDK

    Frontend: React, HTML5, CSS3

    Backend: Node.js, Firebase

    Media: Cloudinary Image API

**Setup Instructions**

Requirements

    Node.js 18.x

    Xumm Developer Account

    XRPL Testnet Credentials

Installation

    git clone https://github.com/your-username/free-to-joy-mvp.git

    cd free-to-joy-mvp

    npm install

    npm run build

Configuration

Create .env file:

    XRPL_NETWORK=testnet

    XRPL_WS_URL=wss://s.altnet.rippletest.net:51233 

    ISSUER_ADDRESS=rYourIssuerAddressHere

**Testing Guide**

Acquire test XRP from faucet.xrpl.org

Run test suite:

    npm test

Monitor transactions on testnet.xrpl.org

**XRPL Documentation**

Official Docs: xrpl.org

Testnet Explorer: testnet.xrpl.org

xrpl.js Reference: js.xrpl.org

Hooks Guide: xrpl-hooks.readme.io
