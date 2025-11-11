// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Minimal interfaces and libs to avoid external deps.
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

library ECDSA {
    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) revert InvalidSignatureLength();
        bytes32 r;
        bytes32 s;
        uint8 v;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }
        if (uint256(s) > 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff) {
            revert InvalidSignatureS();
        }
        if (v != 27 && v != 28) revert InvalidSignatureV();
        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) revert InvalidSignature();
        return signer;
    }

    error InvalidSignature();
    error InvalidSignatureLength();
    error InvalidSignatureS();
    error InvalidSignatureV();
}

/**
 * RewardVault
 *
 * - Custodies USDC and pays a fixed rewardAmount to eligible claimants.
 * - Eligibility is authorized off-chain by a trusted signer via ECDSA signatures.
 * - Prevents replay via used digests mapping.
 * - Does NOT enforce station cooldown on-chain; backend must enforce and sign only when eligible.
 */
contract RewardVault {
    using ECDSA for bytes32;

    event RewardClaimed(address indexed recipient, bytes32 indexed stationId, uint256 submissionId, uint256 amount);
    event SignerUpdated(address indexed newSigner);
    event RewardAmountUpdated(uint256 newAmount);
    event OwnerUpdated(address indexed newOwner);

    address public owner;
    address public immutable usdc;
    address public signer; // backend signer that authorizes claims
    uint256 public rewardAmount; // in smallest units (USDC has 6 decimals on World Chain)

    // Prevent replay for the same signed payload
    mapping(bytes32 => bool) public usedDigests;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _usdc, address _signer, uint256 _rewardAmount) {
        require(_usdc != address(0), "USDC address required");
        require(_signer != address(0), "signer address required");
        owner = msg.sender;
        usdc = _usdc;
        signer = _signer;
        rewardAmount = _rewardAmount; // e.g. 500000 for 0.5 USDC with 6 decimals
    }

    /**
     * Claim payload:
     * - recipient: wallet to receive reward
     * - stationId: bytes32 identifier (backend can hash string station id)
     * - submissionId: supabase row id to bind uniqueness
     * - deadline: unix timestamp after which the signature is invalid
     *
     * The signed message is keccak256(abi.encodePacked(address(this), recipient, stationId, submissionId, rewardAmount, deadline))
     * signed by `signer` with eth_sign (EIP-191).
     */
    function claimReward(
        address recipient,
        bytes32 stationId,
        uint256 submissionId,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "Signature expired");
        require(recipient != address(0), "Invalid recipient");

        bytes32 message = keccak256(
            abi.encodePacked(address(this), recipient, stationId, submissionId, rewardAmount, deadline)
        );
        bytes32 digest = message.toEthSignedMessageHash();
        require(!usedDigests[digest], "Already claimed");

        address recovered = digest.recover(signature);
        require(recovered == signer, "Invalid signer");
        usedDigests[digest] = true;

        require(IERC20(usdc).transfer(recipient, rewardAmount), "USDC transfer failed");
        emit RewardClaimed(recipient, stationId, submissionId, rewardAmount);
    }

    // Admin functions
    function setSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "zero signer");
        signer = newSigner;
        emit SignerUpdated(newSigner);
    }

    function setRewardAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "invalid amount");
        rewardAmount = newAmount;
        emit RewardAmountUpdated(newAmount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero owner");
        owner = newOwner;
        emit OwnerUpdated(newOwner);
    }
}



