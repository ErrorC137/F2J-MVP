let client;
let wallet;
let isConnected = false;
const ISSUER_ADDRESS = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
let leaderboardUpdateInterval;

async function initApp() {
    try {
        client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
        await client.connect();
        setupEventListeners();
    } catch (error) {
        console.error("Initialization failed:", error);
    }
}

async function connectWallet() {
    try {
        wallet = xrpl.Wallet.generate();
        
        await client.fundWallet(wallet);
        
        const trustSetTx = {
            TransactionType: "TrustSet",
            Account: wallet.address,
            LimitAmount: {
                currency: "F2J",
                issuer: ISSUER_ADDRESS,
                value: "1000000"
            }
        };
        await client.submitAndWait(trustSetTx, { wallet });
        
        updateUI();
        startLeaderboardUpdates();
        isConnected = true;

    } catch (error) {
        showError("Connection failed: " + error.message);
    }
}

async function submitVolunteerTime() {
    if (!validateConnection()) return;
    
    const hours = document.getElementById('hours').value;
    const tokens = hours * 10;

    try {
        const tx = await prepareTransaction({
            TransactionType: "Payment",
            Account: ISSUER_ADDRESS,
            Destination: wallet.address,
            Amount: xrplIssuedAmount(tokens)
        }, true);
        
        await submitTransaction(tx);
        showSuccess(`volunteerStatus`, `${tokens} F2J received!`);
        updateUI();

    } catch (error) {
        showError("volunteerStatus", error);
    }
}

async function submitDonation() {
    if (!validateConnection()) return;
    
    const xrpAmount = document.getElementById('donationAmount').value;
    const tokens = xrpAmount * 100;

    try {
        await submitTransaction(await prepareTransaction({
            TransactionType: "Payment",
            Account: wallet.address,
            Destination: ISSUER_ADDRESS,
            Amount: xrpl.xrpToDrops(xrpAmount)
        }));
        
        await submitTransaction(await prepareTransaction({
            TransactionType: "Payment",
            Account: ISSUER_ADDRESS,
            Destination: wallet.address,
            Amount: xrplIssuedAmount(tokens)
        }, true));
        
        showSuccess(`donationStatus`, `${tokens} F2J minted!`);
        updateUI();

    } catch (error) {
        showError("donationStatus", error);
    }
}

async function redeemTokens() {
    if (!validateConnection()) return;
    
    try {
        await submitTransaction(await prepareTransaction({
            TransactionType: "Payment",
            Account: wallet.address,
            Destination: ISSUER_ADDRESS,
            Amount: xrplIssuedAmount(10)
        }));
        
        showSuccess(`redemptionStatus`, "Reward unlocked!");
        updateUI();

    } catch (error) {
        showError("redemptionStatus", error);
    }
}

async function updateLeaderboard() {
    try {
        const response = await client.request({
            command: "account_lines",
            account: ISSUER_ADDRESS,
            ledger_index: "validated"
        });

        const holders = response.result.lines
            .filter(l => l.currency === "F2J")
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10);

        const leaderboardHTML = holders.map((holder, index) => `
            <li class="leaderboard-item">
                <span class="rank">${index + 1}.</span>
                <span class="address">${shortenAddress(holder.account)}</span>
                <span class="tokens">${holder.balance} F2J</span>
            </li>
        `).join('');

        document.getElementById('leaderboardList').innerHTML = leaderboardHTML;

    } catch (error) {
        console.error("Leaderboard update failed:", error);
    }
}

function xrplIssuedAmount(value) {
    return {
        currency: "F2J",
        issuer: ISSUER_ADDRESS,
        value: value.toString()
    };
}

async function prepareTransaction(tx, issuerSign = false) {
    const prepared = await client.autofill(tx);
    return issuerSign 
        ? xrpl.Wallet.fromSeed("sn3nxiW7v8KXzPzAqzyHXbSSKNuN9").sign(prepared)
        : wallet.sign(prepared);
}

async function submitTransaction(signedTx) {
    const result = await client.submitAndWait(signedTx.tx_blob);
    if (result.result.meta.TransactionResult !== "tesSUCCESS") {
        throw new Error("Transaction failed");
    }
}

function updateUI() {
    updateBalance();
    updateLeaderboard();
}

async function updateBalance() {
    const response = await client.request({
        command: "account_info",
        account: wallet.address,
        ledger_index: "validated"
    });
    
    const data = response.result.account_data;
    const xrpBalance = xrpl.dropsToXrp(data.Balance);
    const f2jBalance = data.Balances?.find(b => 
        b.currency === "F2J" && b.issuer === ISSUER_ADDRESS
    )?.value || "0";

    document.getElementById('walletInfo').innerHTML = `
        ${shortenAddress(wallet.address)}<br>
        XRP: ${xrpBalance}<br>
        F2J: ${f2jBalance}
    `;
}

function shortenAddress(address) {
    return address.slice(0, 6) + "..." + address.slice(-4);
}

function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `✅ ${message}`;
    element.style.color = "#2e7d32";
}

function showError(elementId, error) {
    const element = document.getElementById(elementId);
    element.innerHTML = `❌ ${error.message || error}`;
    element.style.color = "#c62828";
}

function validateConnection() {
    if (!isConnected) {
        alert("Please connect wallet first");
        return false;
    }
    return true;
}

function startLeaderboardUpdates() {
    leaderboardUpdateInterval = setInterval(updateLeaderboard, 30000);
    updateLeaderboard();
}

function setupEventListeners() {
    document.querySelectorAll('.redeem-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const cost = parseInt(this.closest('.reward-item').dataset.cost);
            try {
                await submitTransaction(await prepareTransaction({
                    TransactionType: "Payment",
                    Account: wallet.address,
                    Destination: ISSUER_ADDRESS,
                    Amount: xrplIssuedAmount(cost)
                }));
                showSuccess('rewardStatus', `Redeemed ${cost} F2J!`);
                updateUI();
            } catch (error) {
                showError('rewardStatus', error);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', initApp);
