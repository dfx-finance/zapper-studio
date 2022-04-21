import { Inject } from '@nestjs/common';
import Axios from 'axios';
import _, { compact } from 'lodash';

import { IAppToolkit, APP_TOOLKIT } from '~app-toolkit/app-toolkit.interface';
import { Register } from '~app-toolkit/decorators';
import { buildDollarDisplayItem } from '~app-toolkit/helpers/presentation/display-item.present';
import { getImagesFromToken, getLabelFromToken } from '~app-toolkit/helpers/presentation/image.present';
import { ContractType } from '~position/contract.interface';
import { PositionFetcher } from '~position/position-fetcher.interface';
import { AppTokenPosition } from '~position/position.interface';
import { Network } from '~types/network.interface';

import { PickleDemoContractFactory } from '../contracts';
import { PICKLE_DEMO_DEFINITION } from '../pickle-demo.definition';

const appId = PICKLE_DEMO_DEFINITION.id;
const groupId = PICKLE_DEMO_DEFINITION.groups.jar.id;
const network = Network.ETHEREUM_MAINNET;

export type PickleVaultDetails = {
  jarAddress: string;
  network: string;
  apy: string;
};

// Declare the data properties for a Pickle jar token
export type PickleJarDataProps = {
  apy: number;
  tvl: number;
};

@Register.TokenPositionFetcher({ appId, groupId, network })
export class EthereumPickleDemoJarTokenFetcher implements PositionFetcher<AppTokenPosition> {
  constructor(
    @Inject(APP_TOOLKIT) private readonly appToolkit: IAppToolkit,
    @Inject(PickleDemoContractFactory) private readonly pickleDemoContractFactory: PickleDemoContractFactory,
  ) {}

  async getPositions() {
    // Retrieve pool addresses from the Pickle API
    const endpoint = 'https://api.pickle.finance/prod/protocol/pools';
    const data = await Axios.get<PickleVaultDetails[]>(endpoint).then(v => v.data);
    const ethData = data.filter(({ network }) => network === 'eth');
    const jarAddresses = ethData.map(v => v.jarAddress.toLowerCase());
    const jarAddressToDetails = _.keyBy(ethData, v => v.jarAddress.toLowerCase());

    // A user can deposit base tokens like LOOKS or LQTY
    const baseTokenDependencies = await this.appToolkit.getBaseTokenPrices(network);

    // ...or a user can deposit other app tokens like Uniswap or Curve LP
    const appTokenDependencies = await this.appToolkit.getAppTokenPositions(
      { appId: 'uniswap-v2', groupIds: ['pool'], network },
      { appId: 'curve', groupIds: ['pool'], network },
    );

    const allTokenDependencies = [...appTokenDependencies, ...baseTokenDependencies];

    // Create a multicall wrapper instance to batch chain RPC calls
    const multicall = this.appToolkit.getMulticall(network);

    // Build a token object for each jar address, using data retrieved on-chain with Ethers
    const tokens = await Promise.all(
      jarAddresses.map(async jarAddress => {
        // Initiates a smart contract instance pointing to jar token address
        const contract = this.pickleDemoContractFactory.pickleJar({ address: jarAddress, network });

        // Request the symbol, decimals, supply, etc. for the jar token
        const [symbol, decimals, supplyRaw, underlyingTokenAddressRaw, ratioRaw] = await Promise.all([
          multicall.wrap(contract).symbol(),
          multicall.wrap(contract).decimals(),
          multicall.wrap(contract).totalSupply(),
          multicall.wrap(contract).token(),
          multicall.wrap(contract).getRatio(),
        ]);

        // Denormalize the supply
        const supply = Number(supplyRaw) / 10 ** decimals;

        // Find the underlying token in our dependencies
        // Note: If it is not a found, then we have not indexed the underlying token, and we cannot
        // index the jar token since its price depends on the underlying token price.
        const underlyingTokenAddress = underlyingTokenAddressRaw.toLowerCase();
        const underlyingToken = allTokenDependencies.find(v => v.address === underlyingTokenAddress);
        if (!underlyingToken) return null;
        const tokens = [underlyingToken];

        // Denormalize the share price
        const pricePerShare = Number(ratioRaw) / 10 ** 18;
        const price = pricePerShare * underlyingToken.price;

        // Retrieve the APY from the map we created in the first step
        const apy = (Number(jarAddressToDetails[jarAddress]?.apy) ?? 0) / 100;

        // The TVL is the deposited reserve times the price of the deposited token
        const underlyingTokenContract = this.pickleDemoContractFactory.pickleJar({
          address: underlyingToken.address,
          network,
        });
        const reserveRaw = await multicall.wrap(underlyingTokenContract).balanceOf(jarAddress);
        const reserve = Number(reserveRaw) / 10 ** underlyingToken.decimals;
        const tvl = reserve * underlyingToken.price;

        // As label, use the underlying label (i.e.: 'LOOKS' or 'UNI-V2 LOOKS / ETH')
        const label = `${getLabelFromToken(underlyingToken)} Jar`;
        // For images, we'll use the underlying images as well
        const images = getImagesFromToken(underlyingToken);
        // For secondary label, we'll use price of jar
        const secondaryLabel = buildDollarDisplayItem(price);
        // For a tertiary label, we'll use APY
        const tertiaryLabel = `${(apy * 100).toFixed(3)}% APY`;

        // Create the token object
        const token: AppTokenPosition<PickleJarDataProps> = {
          type: ContractType.APP_TOKEN,
          appId,
          groupId,
          address: jarAddress,
          network,
          symbol,
          decimals,
          supply,
          tokens,
          price,
          pricePerShare,
          dataProps: {
            apy,
            tvl,
          },
          displayProps: {
            label,
            images,
            secondaryLabel,
            tertiaryLabel,
          },
        };

        return token;
      }),
    );

    return compact(tokens);
  }
}
