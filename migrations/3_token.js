const Autentica = artifacts.require("Autentica");

module.exports = async function (deployer, network, accounts) {
  const [owner] = accounts
  
  // Deploy
  await deployer.deploy(Autentica)
  const token = await Autentica.deployed()
  
  // Logs
  console.table([
    {
      name: 'Owner',
      address: owner
    },
    {
      name: 'Autentica ERC-20',
      address: token.address
    },
  ]);
};
