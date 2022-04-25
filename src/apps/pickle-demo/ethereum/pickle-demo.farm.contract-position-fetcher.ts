import { Inject } from '@nestjs/common';
import Axios from 'axios';
import _ from 'lodash';

import { IAppToolkit, APP_TOOLKIT } from '~app-toolkit/app-toolkit.interface';
import { Register } from '~app-toolkit/decorators';
import { buildDollarDisplayItem } from '~app-toolkit/helpers/presentation/display-item.present';
import { getImagesFromToken, getLabelFromToken } from '~app-toolkit/helpers/presentation/image.present';
import { ContractType } from '~position/contract.interface';
import { PositionFetcher } from '~position/position-fetcher.interface';
import { ContractPosition } from '~position/position.interface';
import { claimable, supplied } from '~position/position.utils';
import { Network } from '~types/network.interface';

import { PickleDemoContractFactory } from '../contracts';
import { PICKLE_DEMO_DEFINITION } from '../pickle-demo.definition';

const appId = PICKLE_DEMO_DEFINITION.id;
const groupId = PICKLE_DEMO_DEFINITION.groups.farm.id;
const network = Network.ETHEREUM_MAINNET;

// Export a partial of the return type from Pickle API
export type PickleVaultDetails = {
  jarAddress: string;
  gaugeAddress: string;
  network: string;
};

// Data properties for Pickle jar token
export type PickleFarmContractPositionDataProps = {
  totalValueLocked: number;
};
@Register.ContractPositionFetcher({ appId, groupId, network })
export class EthereumPickleDemoFarmContractPositionFetcher implements PositionFetcher<ContractPosition> {
  constructor(
    @Inject(APP_TOOLKIT) private readonly appToolkit: IAppToolkit,
    @Inject(PickleDemoContractFactory) private readonly pickleDemoContractFactory: PickleDemoContractFactory,
  ) {}

  async getPositions() {
    // Retrieve pool addresses from Pickle API
    const endpoint = 'https://api.pickle.finance/prod/protocol/pools';
    const data = await Axios.get<PickleVaultDetails[]>(endpoint).then(v => v.data);
    const ethData = data.filter(({ network }) => network === 'eth');
    const farmDefinitions = ethData
      .filter(({ gaugeAddress }) => !!gaugeAddress)
      .map(({ jarAddress, gaugeAddress }) => ({
        address: gaugeAddress.toLowerCase(),
        stakedTokenAddress: jarAddress.toLowerCase(),
        rewardTokenAddress: '0x429881672b9ae42b8eba0e26cd9c73711b891ca5', // Pickle
      }));

    // Reward token is PICKLE which is base token
    const baseTokens = await this.appToolkit.getBaseTokenPrices(network);

    // Staked tokens are Pickle Jar tokens so resolve these too
    const appTokens = await this.appToolkit.getAppTokenPositions({ appId: 'pickle-demo', groupIds: ['jar'], network });

    const allTokens = [...appTokens, ...baseTokens];

    // // Create multicall instance to batch RPC requests
    const multicall = this.appToolkit.getMulticall(network);

    const tokens = await Promise.all(
      farmDefinitions.map(async ({ address, stakedTokenAddress, rewardTokenAddress }) => {
        const stakedToken = allTokens.find(v => v.address === stakedTokenAddress);
        const rewardToken = allTokens.find(v => v.address === rewardTokenAddress);
        if (!stakedToken || !rewardToken) return null;

        const tokens = [supplied(stakedToken), claimable(rewardToken)];

        // Initiate smart contract instance pointing to this Pickle jar address
        const contract = this.pickleDemoContractFactory.pickleJar({ address: stakedToken.address, network });

        // Request the jar token balance of this farm
        const [balanceRaw] = await Promise.all([multicall.wrap(contract).balanceOf(address)]);

        // Denormalize the balance as the TVL
        const totalValueLocked = Number(balanceRaw) / 10 ** stakedToken.decimals;

        // As a label, use the underlying label with the prefix 'Staked'
        const label = `Staked ${getLabelFromToken(stakedToken)}`;

        // For images, use the underlying token images
        const images = getImagesFromToken(stakedToken);

        // For the secondary label, use the price of the token jar
        const secondaryLabel = buildDollarDisplayItem(stakedToken.price);

        // Create contract position object
        const position: ContractPosition<PickleFarmContractPositionDataProps> = {
          type: ContractType.POSITION,
          appId,
          groupId,
          address,
          network,
          tokens,
          dataProps: {
            totalValueLocked,
          },
          displayProps: {
            label,
            secondaryLabel,
            images,
          },
        };
        return position;
      }),
    );

    return _.compact(tokens);
  }
}
