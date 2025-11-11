export const RewardVaultABI = [
  {
    "type": "function",
    "name": "claimReward",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "recipient", "type": "address" },
      { "name": "stationId", "type": "bytes32" },
      { "name": "submissionId", "type": "uint256" },
      { "name": "deadline", "type": "uint256" },
      { "name": "signature", "type": "bytes" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "rewardAmount",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "usdc",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "type": "address" }]
  },
  {
    "type": "event",
    "name": "RewardClaimed",
    "inputs": [
      { "indexed": true, "name": "recipient", "type": "address" },
      { "indexed": true, "name": "stationId", "type": "bytes32" },
      { "indexed": false, "name": "submissionId", "type": "uint256" },
      { "indexed": false, "name": "amount", "type": "uint256" }
    ],
    "anonymous": false
  }
] as const



