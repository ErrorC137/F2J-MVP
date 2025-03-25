const Xumm = new window.Xumm('YOUR_XUMM_API_KEY');
let client;
let wallet;
let isConnected = false;

async function initXRPL() {
    client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
    await client.connect();
}


async function connectWallet() {
    try {
        await initXRPL();
        

        const { address, account } = await Xumm.authorize();
        wallet = { address, account };
        
        // Setup Trust Line
        const trustSetTx = {
            TransactionType: "TrustSet",
            Account: wallet.address,
            LimitAmount: {
                currency: "F2J",
                issuer: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
                value: "1000000"
            }
        };
        
        await client.submitAndWait(trustSetTx, { wallet });
        updateBalance();
        isConnected = true;
        
    } catch (error) {
        alert("XRPL Connection Error: " + error.message);
    }
}

async function updateBalance() {
    const response = await client.request({
        command: "account_info",
        account: wallet.address,
        ledger_index: "validated"
    });
    
    const xrpBalance = xrpl.dropsToXrp(response.result.account_data.Balance);
    const f2jBalance = response.result.account_data.Balances?.find(b => 
        b.currency === "F2J" && b.issuer === "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"
    )?.value || "0";

    document.getElementById('walletInfo').innerHTML = `
        Connected Wallet: ${wallet.address}<br>
        XRP Balance: ${xrpBalance}<br>
        F2J Balance: ${f2jBalance}
    `;
}

async function submitVolunteerTime() {
    if (!isConnected) return alert("Connect wallet first!");
    
    const hours = document.getElementById('hours').value;
    const tokens = hours * 10;

    try {
        const tx = {
            TransactionType: "Payment",
            Account: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
            Destination: wallet.address,
            Amount: {
                currency: "F2J",
                value: tokens.toString(),
                issuer: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"
            },
            Memos: [{
                Memo: {
                    MemoData: xrpl.convertStringToHex(`Volunteered ${hours} hours`)
                }
            }]
        };

        const prepared = await client.autofill(tx);
        const signed = xrpl.Wallet.fromSeed("sn3nxiW7v8KXzPzAqzyHXbSSKNuN9").sign(prepared);
        await client.submitAndWait(signed.tx_blob);
        
        document.getElementById('volunteerStatus').innerHTML = 
            `✅ ${tokens} F2J tokens received!`;
        updateBalance();
        
    } catch (error) {
        document.getElementById('volunteerStatus').innerHTML = 
            "❌ Error: " + error.message;
    }
}

async function submitDonation() {
    if (!isConnected) return alert("Connect wallet first!");
    
    const xrpAmount = document.getElementById('donationAmount').value;
    const tokens = xrpAmount * 100;

    try {

        const paymentTx = {
            TransactionType: "Payment",
            Account: wallet.address,
            Destination: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
            Amount: xrpl.xrpToDrops(xrpAmount),
            Memos: [{
                Memo: {
                    MemoData: xrpl.convertStringToHex("Donation")
                }
            }]
        };
        
        await client.submitAndWait(paymentTx, { wallet });
        

        const mintTx = {
            TransactionType: "Payment",
            Account: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
            Destination: wallet.address,
            Amount: {
                currency: "F2J",
                value: tokens.toString(),
                issuer: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"
            }
        };
        
        const preparedMint = await client.autofill(mintTx);
        const signedMint = xrpl.Wallet.fromSeed("sn3nxiW7v8KXzPzAqzyHXbSSKNuN9").sign(preparedMint);
        await client.submitAndWait(signedMint.tx_blob);
        
        document.getElementById('donationStatus').innerHTML = 
            `✅ Donated ${xrpAmount} XRP ➔ ${tokens} F2J received!`;
        updateBalance();
        
    } catch (error) {
        document.getElementById('donationStatus').innerHTML = 
            "❌ Error: " + error.message;
    }
}


async function redeemTokens() {
    if (!isConnected) return alert("Connect wallet first!");
    
    try {
        const tx = {
            TransactionType: "Payment",
            Account: wallet.address,
            Destination: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
            Amount: {
                currency: "F2J",
                value: "10",
                issuer: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"
            },
            Memos: [{
                Memo: {
                    MemoData: xrpl.convertStringToHex("Redeemed reward")
                }
            }]
        };
        
        await client.submitAndWait(tx, { wallet });
        document.getElementById('redemptionStatus').innerHTML = 
            "✅ Reward unlocked! Check your email.";
        updateBalance();
        
    } catch (error) {
        document.getElementById('redemptionStatus').innerHTML = 
            "❌ Error: " + error.message;
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    await initXRPL();
    setupRewardCatalog();
    setupProofUpload();
});
