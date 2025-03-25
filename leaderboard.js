let leaderboardUpdateInterval;

async function updateLeaderboard() {
    try {
        const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
        await client.connect();
        
        // Get all F2J token holders
        const response = await client.request({
            command: "account_lines",
            account: ISSUER_ADDRESS,
            ledger_index: "validated"
        });
        
        const holders = response.result.lines
            .filter(line => line.currency === "F2J")
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10); // Top 10
        
        const leaderboardHTML = holders.map((holder, index) => `
            <li class="leaderboard-item">
                <span class="rank">${index + 1}.</span>
                <span class="address">${holder.account.slice(0, 6)}...${holder.account.slice(-4)}</span>
                <span class="badge">${holder.balance} F2J</span>
            </li>
        `).join('');

        document.getElementById('leaderboardList').innerHTML = leaderboardHTML;
        await client.disconnect();
        
    } catch (error) {
        console.error("Leaderboard update failed:", error);
    }
}

// Auto-update every 60 seconds
function startLeaderboardUpdates() {
    leaderboardUpdateInterval = setInterval(updateLeaderboard, 60000);
    updateLeaderboard(); // Initial load
}

// Stop updates when needed
function stopLeaderboardUpdates() {
    clearInterval(leaderboardUpdateInterval);
}
