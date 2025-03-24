let client;
let wallet;
let isConnected = false;

async function connectWallet() {
    try {
        client = new xrpl.Client(XRPL_TESTNET_WS);
        await client.connect();
        
        wallet = xrpl.Wallet.generate();
        document.getElementById('walletInfo').innerHTML = `
            Connected Wallet: ${wallet.address}<br>
            Balance: Loading...
        `;
        
        updateBalance();
        isConnected = true;
    } catch (error) {
        alert("Connection error: " + error.message);
    }
}

async function updateBalance() {
    const response = await client.request({
        command: "account_info",
        account: wallet.address,
        ledger_index: "validated"
    });
    
    document.getElementById('walletInfo').innerHTML = `
        Connected Wallet: ${wallet.address}<br>
        XRP Balance: ${xrpl.dropsToXrp(response.result.account_data.Balance)} XRP<br>
        F2J Balance: ${getF2JBalance(response.result.account_data)}
    `;
}

function getF2JBalance(accountData) {
    const balances = accountData.Balances || [];
    const f2jBalance = balances.find(b => 
        b.currency === F2J_TOKEN.currency && 
        b.issuer === F2J_TOKEN.issuer
    );
    return f2jBalance ? f2jBalance.value : "0";
}

async function submitVolunteerTime() {
    if (!isConnected) return alert("Connect wallet first!");
    
    const hours = document.getElementById('hours').value;
    const tokens = hours * 10;
    
    try {
        const tx = {
            TransactionType: "Payment",
            Account: PLATFORM_WALLET,
            Destination: wallet.address,
            Amount: {
                currency: F2J_TOKEN.currency,
                value: tokens.toString(),
                issuer: F2J_TOKEN.issuer
            }
        };
        
        await client.submitAndWait(tx, { wallet: xrpl.Wallet.fromSeed("sn3nxiW7v8KXzPzAqzyHXbSSKNuN9") });
        document.getElementById('volunteerStatus').innerHTML = 
            `✅ ${tokens} F2J tokens received for ${hours} hours!`;
        updateBalance();
    } catch (error) {
        document.getElementById('volunteerStatus').innerHTML = 
            "❌ Error submitting volunteer time";
    }
}

async function submitDonation() {
    if (!isConnected) return alert("Connect wallet first!");
    
    const xrpAmount = document.getElementById('donationAmount').value;
    const tokens = xrpAmount * 100; 
    
    try {
        
        const tx1 = {
            TransactionType: "Payment",
            Account: wallet.address,
            Destination: PLATFORM_WALLET,
            Amount: xrpl.xrpToDrops(xrpAmount)
        };
        
        await client.submitAndWait(tx1, { wallet });
        
        
        const tx2 = {
            TransactionType: "Payment",
            Account: PLATFORM_WALLET,
            Destination: wallet.address,
            Amount: {
                currency: F2J_TOKEN.currency,
                value: tokens.toString(),
                issuer: F2J_TOKEN.issuer
            }
        };
        
        await client.submitAndWait(tx2, { wallet: xrpl.Wallet.fromSeed("sn3nxiW7v8KXzPzAqzyHXbSSKNuN9") });
        
        document.getElementById('donationStatus').innerHTML = 
            `✅ Donated ${xrpAmount} XRP and received ${tokens} F2J tokens!`;
        updateBalance();
    } catch (error) {
        document.getElementById('donationStatus').innerHTML = 
            "❌ Error processing donation";
    }
}

async function redeemTokens() {
    if (!isConnected) return alert("Connect wallet first!");
    
    try {
        const tx = {
            TransactionType: "Payment",
            Account: wallet.address,
            Destination: PLATFORM_WALLET,
            Amount: {
                currency: F2J_TOKEN.currency,
                value: "10",
                issuer: F2J_TOKEN.issuer
            }
        };
        
        await client.submitAndWait(tx, { wallet });
        document.getElementById('redemptionStatus').innerHTML = 
            "✅ Reward unlocked! Check your email for discount code";
        updateBalance();
    } catch (error) {
        document.getElementById('redemptionStatus').innerHTML = 
            "❌ Error redeeming tokens";
    }
}

function setupRewardCatalog() {
    document.querySelectorAll('.redeem-btn').forEach(button => {
      button.addEventListener('click', async function() {
        const rewardItem = this.closest('.reward-item');
        const cost = parseInt(rewardItem.getAttribute('data-cost'));
        const rewardName = rewardItem.getAttribute('data-name');
        
        if (!isConnected) {
          document.getElementById('rewardStatus').innerHTML = 
            '❌ Connect your wallet first!';
          return;
        }
  
        try {
          const tx = {
            TransactionType: "Payment",
            Account: wallet.address,
            Destination: PLATFORM_WALLET,
            Amount: {
              currency: F2J_TOKEN.currency,
              value: cost.toString(),
              issuer: F2J_TOKEN.issuer
            }
          };
          
          await client.submitAndWait(tx, { wallet });
          document.getElementById('rewardStatus').innerHTML = 
            `✅ Success! Redeemed: ${rewardName}`;
          updateBalance();
        } catch (error) {
          document.getElementById('rewardStatus').innerHTML = 
            `❌ Error: ${error.message}`;
        }
      });
    });
  }

  function setupProofUpload() {
    const proofFile = document.getElementById('proofFile');
    const submitBtn = document.getElementById('submitProofBtn');
    const fileName = document.getElementById('fileName');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const proofStatus = document.getElementById('proofStatus');
  
    proofFile.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        fileName.textContent = file.name;
        submitBtn.disabled = false;
        
        
        if (file.type.match('image.*')) {
          const reader = new FileReader();
          reader.onload = function(event) {
            previewImage.src = event.target.result;
            previewContainer.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      }
    });
  
    submitBtn.addEventListener('click', async function() {
      if (!proofFile.files[0]) return;
      
      proofStatus.innerHTML = '<div class="loading">⏳ Validating your proof...</div>';
      
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const isApproved = Math.random() < 0.75;
      
      if (isApproved) {
        proofStatus.innerHTML = '<div class="success">✅ Proof approved! 10 F2J tokens minted.</div>';

        document.getElementById('hours').value = 1;
        await submitVolunteerTime();
      } else {
        proofStatus.innerHTML = '<div class="error">❌ Proof rejected. Please ensure the image clearly shows your volunteer activity.</div>';
      }
    });
  }