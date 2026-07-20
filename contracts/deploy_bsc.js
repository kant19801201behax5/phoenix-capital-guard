/**
 * Deploy PhoenixOracleRegistry to BNB Smart Chain TESTNET (chainId 97).
 * Reuses the contract already battle-tested on Mantle Sepolia (Turing Test 2026).
 *
 *   1) fund the deployer with free tBNB:  https://testnet.bnbchain.org/faucet-smart
 *   2) node contracts/deploy_bsc.js        (reads PRIVATE_KEY from .deploy.env)
 */
const { ethers } = require('ethers');
const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.deploy.env') });

const BSC_RPC     = process.env.BSC_RPC || 'https://bsc-testnet-rpc.publicnode.com';
const CHAIN_ID    = 97;
const { abi: ABI, bytecode: BYTECODE } = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'compiled.json'), 'utf8')
);

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error('\n❌  Set PRIVATE_KEY in .deploy.env first.\n'); process.exit(1); }

  const provider = new ethers.JsonRpcProvider(BSC_RPC, { chainId: CHAIN_ID, name: 'bsc-testnet' });
  const wallet   = new ethers.Wallet(pk, provider);
  const ORACLE_ADDR = process.env.ORACLE_ADDR || wallet.address; // oracle = deployer (pusher uses same key)

  console.log('Deployer :', wallet.address);
  const bal = await provider.getBalance(wallet.address);
  console.log('Balance  :', ethers.formatEther(bal), 'tBNB');
  if (bal === 0n) {
    console.error('\n❌  No tBNB for gas. Faucet: https://testnet.bnbchain.org/faucet-smart');
    console.error('    Send tBNB to:', wallet.address, '\n');
    process.exit(1);
  }

  const factory  = new ethers.ContractFactory(ABI, '0x' + BYTECODE, wallet);
  console.log('\nDeploying PhoenixOracleRegistry to BSC testnet...');
  const contract = await factory.deploy(ORACLE_ADDR, { gasLimit: 700000 });
  console.log('TX       :', contract.deploymentTransaction()?.hash);
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log('\n✅  DEPLOYED');
  console.log('Address  :', addr);
  console.log('Explorer : https://testnet.bscscan.com/address/' + addr);

  fs.writeFileSync(
    path.join(__dirname, 'deployed_bsc.json'),
    JSON.stringify({ contract: 'PhoenixOracleRegistry', address: addr,
      network: 'bsc-testnet', chainId: CHAIN_ID,
      deployer: wallet.address, oracle: ORACLE_ADDR,
      timestamp: new Date().toISOString() }, null, 2)
  );
  console.log('\n📋  Saved to contracts/deployed_bsc.json\n');
}

main().catch(e => { console.error('\n❌ ', e.message); process.exit(1); });
