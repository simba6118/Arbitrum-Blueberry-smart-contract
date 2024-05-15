async function main() {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`Your address: ${deployer}`)

    const lock = await deploy("SportBetting", {
        from: deployer,
        args: [
            '0xDA24FC208f87078366dcF4837EAdC606E157D100',
            '0x45b3C87852be9519b6355E14cE7Da9E28726Ec43'
        ],
        log: true,
        waitConfirmations: 1,
    })

    console.log('Contract Address:', lock.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
