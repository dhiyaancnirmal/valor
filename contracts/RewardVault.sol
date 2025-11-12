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
 * - Custodies USDC and pays variable rewardAmount to eligible claimants.
 * - Eligibility is authorized off-chain by a trusted signer via ECDSA signatures.
 * - Amount is specified in the signature, allowing variable rewards per submission.
 * - Prevents replay via used digests mapping.
 * - Supports both individual claims and batch payouts.
 */
contract RewardVault {
    using ECDSA for bytes32;

    event RewardClaimed(address indexed recipient, bytes32 indexed stationId, uint256 submissionId, uint256 amount);
    event BatchPayout(address indexed recipient, uint256 amount, uint256 submissionId);
    event SignerUpdated(address indexed newSigner);
    event OwnerUpdated(address indexed newOwner);

    address public owner;
    address public immutable usdc;
    address public signer; // backend signer that authorizes claims

    // Prevent replay for the same signed payload
    mapping(bytes32 => bool) public usedDigests;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _usdc, address _signer) {
        require(_usdc != address(0), "USDC address required");
        require(_signer != address(0), "signer address required");
        owner = msg.sender;
        usdc = _usdc;
        signer = _signer;
    }

    /**
     * Claim payload:
     * - recipient: wallet to receive reward
     * - stationId: bytes32 identifier (backend can hash string station id)
     * - submissionId: supabase row id to bind uniqueness
     * - amount: reward amount in smallest USDC units (6 decimals)
     * - deadline: unix timestamp after which the signature is invalid
     *
     * The signed message is keccak256(abi.encodePacked(address(this), recipient, stationId, submissionId, amount, deadline))
     * signed by `signer` with eth_sign (EIP-191).
     */
    function claimReward(
        address recipient,
        bytes32 stationId,
        uint256 submissionId,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "Signature expired");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");

        bytes32 message = keccak256(
            abi.encodePacked(address(this), recipient, stationId, submissionId, amount, deadline)
        );
        bytes32 digest = message.toEthSignedMessageHash();
        require(!usedDigests[digest], "Already claimed");

        address recovered = digest.recover(signature);
        require(recovered == signer, "Invalid signer");
        usedDigests[digest] = true;

        require(IERC20(usdc).transfer(recipient, amount), "USDC transfer failed");
        emit RewardClaimed(recipient, stationId, submissionId, amount);
    }

    /**
     * Batch payout function for owner to process multiple rewards efficiently.
     * Each payout requires a valid signature from the signer.
     * 
     * @param recipients Array of recipient addresses
     * @param stationIds Array of station IDs (bytes32)
     * @param submissionIds Array of submission IDs
     * @param amounts Array of reward amounts
     * @param deadlines Array of deadline timestamps
     * @param signatures Array of signatures from signer
     */
    function batchPayout(
        address[] calldata recipients,
        bytes32[] calldata stationIds,
        uint256[] calldata submissionIds,
        uint256[] calldata amounts,
        uint256[] calldata deadlines,
        bytes[] calldata signatures
    ) external onlyOwner {
        uint256 length = recipients.length;
        require(
            length == stationIds.length &&
            length == submissionIds.length &&
            length == amounts.length &&
            length == deadlines.length &&
            length == signatures.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < length; i++) {
            _processPayout(
                    recipients[i],
                    stationIds[i],
                    submissionIds[i],
                    amounts[i],
                deadlines[i],
                signatures[i]
            );
        }
    }

    /**
     * Internal function to process a single payout
     */
    function _processPayout(
        address recipient,
        bytes32 stationId,
        uint256 submissionId,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) internal {
        require(block.timestamp <= deadline, "Signature expired");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");

        bytes32 message = keccak256(
            abi.encodePacked(
                address(this),
                recipient,
                stationId,
                submissionId,
                amount,
                deadline
                )
            );
            bytes32 digest = message.toEthSignedMessageHash();
            require(!usedDigests[digest], "Already claimed");

        address recovered = digest.recover(signature);
            require(recovered == signer, "Invalid signer");
            usedDigests[digest] = true;

        require(IERC20(usdc).transfer(recipient, amount), "USDC transfer failed");
        emit BatchPayout(recipient, amount, submissionId);
    }

    // Admin functions
    function setSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "zero signer");
        signer = newSigner;
        emit SignerUpdated(newSigner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero owner");
        owner = newOwner;
        emit OwnerUpdated(newOwner);
    }

    /**
     * Emergency function to withdraw USDC (only owner)
     */
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(IERC20(usdc).transfer(owner, amount), "USDC transfer failed");
    }
}