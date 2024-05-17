async function main() {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`Your address: ${deployer}`)

    const lock = await deploy("SportBetting", {
        from: deployer,
        args: [
            '0x73C3cDd1418c3F17D54A81148387d93122802E72',
            '0x38e86d1dD957619aa199BbAD0027DE3C410B2754'
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
