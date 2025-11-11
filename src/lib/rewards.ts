import { keccak256, toHex } from "viem"
import { signMessage } from "viem/accounts"

// Station IDs are strings in our DB; we hash them to bytes32 for the contract
export function stationIdToBytes32(stationId: string): `0x${string}` {
  const hexString = toHex(stationId)
  return keccak256(hexString)
}

export type ClaimMessage = {
  contract: `0x${string}`
  recipient: `0x${string}`
  stationIdBytes32: `0x${string}`
  submissionId: bigint
  rewardAmount: bigint
  deadline: bigint
}

// Mirrors solidity: keccak256(abi.encodePacked(address(this), recipient, stationId, submissionId, rewardAmount, deadline))
export function encodeClaimPacked(msg: ClaimMessage): `0x${string}` {
  const packed = new Uint8Array([
    // address(this) 20 bytes
    ...hexToBytes(msg.contract),
    // recipient 20 bytes
    ...hexToBytes(msg.recipient),
    // stationId bytes32 32 bytes
    ...hexToBytes(msg.stationIdBytes32),
    // submissionId uint256 32 bytes
    ...bigintToBytes32(msg.submissionId),
    // rewardAmount uint256 32 bytes
    ...bigintToBytes32(msg.rewardAmount),
    // deadline uint256 32 bytes
    ...bigintToBytes32(msg.deadline),
  ])
  return keccak256(packed)
}

export async function signClaimMessage(
  claim: ClaimMessage,
  signerPrivateKey: `0x${string}`
): Promise<`0x${string}`> {
  console.log('Signing claim with key length:', signerPrivateKey.length)

  const hash = encodeClaimPacked(claim)
  console.log('Hash to sign:', hash)

  // Use viem's standalone signMessage function
  const signature = await signMessage({
    message: { raw: hash },
    privateKey: signerPrivateKey
  })

  console.log('Signature created:', signature?.length)
  return signature
}

function hexToBytes(hex: `0x${string}`): Uint8Array {
  const clean = hex.slice(2)
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
  }
  return bytes
}

function bigintToBytes32(value: bigint): Uint8Array {
  const hex = value.toString(16).padStart(64, "0")
  return hexToBytes(`0x${hex}`)
}


