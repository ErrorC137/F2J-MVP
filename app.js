document.addEventListener('DOMContentLoaded', () => {
    let client;
    let wallet;
    let isConnected = false;
    let leaderboardUpdateInterval;
    const ISSUER_ADDRESS = 'rLjzXx2nnES7jxb3shW1FCuChw8bFKXvZK';


    async function initApp() {
        try {
            client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
            await client.connect();
            console.log("Connected to XRPL Testnet");
        } catch (error) {
            showGlobalError(`Connection failed: ${error.message}`);
        }
    }


    window.connectWallet = async () => {
        try {
            if (!client || !client.isConnected()) {
                throw new Error("Not connected to XRPL network");
            }

            wallet = xrpl.Wallet.generate();
            const fundResult = await client.fundWallet(wallet);
            
            if (!fundResult.balance || fundResult.balance.value === '0') {
                throw new Error("Test XRP funding failed");
            }

            const trustSetTx = await client.autofill({
                TransactionType: "TrustSet",
                Account: wallet.address,
                LimitAmount: {
                    currency: "F2J",
                    issuer: ISSUER_ADDRESS,
                    value: "1000000"
                }
            });
            
            const signedTrust = wallet.sign(trustSetTx);
            await client.submitAndWait(signedTrust.tx_blob);
            
            isConnected = true;
            updateUI();
            startLeaderboardUpdates();

        } catch (error) {
            showGlobalError(`Wallet setup failed: ${error.message}`);
        }
    };


    window.submitVolunteerTime = async () => {
        if (!validateConnection()) return;
        
        try {
            const hours = document.getElementById('hours').value;
            const tokens = hours * 10;

            const tx = await prepareTransaction({
                TransactionType: "Payment",
                Account: ISSUER_ADDRESS,
                Destination: wallet.address,
                Amount: xrplIssuedAmount(tokens),
                LastLedgerSequence: undefined
            }, true);
            
            await submitTransaction(tx);
            showSuccess('volunteerStatus', `${tokens} F2J received!`);
            updateUI();

        } catch (error) {
            showError('volunteerStatus', handleXRPLerror(error));
        }
    };


    window.submitDonation = async () => {
        if (!validateConnection()) return;
        
        try {
            const xrpAmount = document.getElementById('donationAmount').value;
            const tokens = xrpAmount * 100;


            await submitTransaction(await prepareTransaction({
                TransactionType: "Payment",
                Account: wallet.address,
                Destination: ISSUER_ADDRESS,
                Amount: xrpl.xrpToDrops(xrpAmount),
                LastLedgerSequence: undefined
            }));
            

            await submitTransaction(await prepareTransaction({
                TransactionType: "Payment",
                Account: ISSUER_ADDRESS,
                Destination: wallet.address,
                Amount: xrplIssuedAmount(tokens),
                LastLedgerSequence: undefined
            }, true));
            
            showSuccess('donationStatus', `${tokens} F2J minted!`);
            updateUI();

        } catch (error) {
            showError('donationStatus', handleXRPLerror(error));
        }
    };

    
    window.redeemTokens = async () => {
        if (!validateConnection()) return;
        
        try {
            await submitTransaction(await prepareTransaction({
                TransactionType: "Payment",
                Account: wallet.address,
                Destination: ISSUER_ADDRESS,
                Amount: xrplIssuedAmount(10),
                LastLedgerSequence: undefined
            }));
            
            showSuccess('redemptionStatus', "Reward unlocked!");
            updateUI();

        } catch (error) {
            showError('redemptionStatus', handleXRPLerror(error));
        }
    };

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
            ? xrpl.Wallet.fromSeed("sEdTee8Q7yVawi6Qq6bG7NLgoCtnHDP").sign(prepared)
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
        try {
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

        } catch (error) {
            showGlobalError("Failed to update balances: " + error.message);
        }
    }

    function shortenAddress(address) {
        return address.slice(0, 6) + "..." + address.slice(-4);
    }

    function showSuccess(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `✅ ${message}`;
            element.style.color = "#2e7d32";
        }
    }

    function showError(elementId, error) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `❌ ${error}`;
            element.style.color = "#c62828";
        }
    }

    function showGlobalError(message) {
        const errorDiv = document.getElementById('global-error');
        if (errorDiv) {
            errorDiv.innerHTML = `❌ ${message}`;
            errorDiv.style.display = 'block';
        }
    }

    function validateConnection() {
        if (!isConnected) {
            alert("Please connect wallet first");
            return false;
        }
        return true;
    }

    function startLeaderboardUpdates() {
        if (leaderboardUpdateInterval) clearInterval(leaderboardUpdateInterval);
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
                        Amount: xrplIssuedAmount(cost),
                        LastLedgerSequence: undefined
                    }));
                    showSuccess('rewardStatus', `Redeemed ${cost} F2J!`);
                    updateUI();
                } catch (error) {
                    showError('rewardStatus', handleXRPLerror(error));
                }
            });
        });
    }

    function handleXRPLerror(error) {
        console.error("XRPL Error:", error);
        return error.message || "Blockchain operation failed";
    }


    initApp();
    setTimeout(() => {
        if (!client?.isConnected()) {
            showGlobalError("Connection to XRPL network failed");
        }
    }, 5000);
});
