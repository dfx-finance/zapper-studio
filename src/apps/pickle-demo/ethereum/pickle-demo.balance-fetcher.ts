import { Inject } from '@nestjs/common';

import { drillBalance } from '~app-toolkit';
import { IAppToolkit, APP_TOOLKIT } from '~app-toolkit/app-toolkit.interface';
import { Register } from '~app-toolkit/decorators';
import { presentBalanceFetcherResponse } from '~app-toolkit/helpers/presentation/balance-fetcher-response.present';
import { BalanceFetcher } from '~balance/balance-fetcher.interface';
import { isClaimable, isSupplied } from '~position/position.utils';
import { Network } from '~types/network.interface';

import { PickleDemoContractFactory } from '../contracts';
import { PICKLE_DEMO_DEFINITION } from '../pickle-demo.definition';

const network = Network.ETHEREUM_MAINNET;

@Register.BalanceFetcher(PICKLE_DEMO_DEFINITION.id, network)
export class EthereumPickleDemoBalanceFetcher implements BalanceFetcher {
  constructor(
    @Inject(APP_TOOLKIT) private readonly appToolkit: IAppToolkit,
    @Inject(PickleDemoContractFactory) private readonly pickleDemoContractFactory: PickleDemoContractFactory,
  ) {}

  async getJarTokenBalances(address: string) {
    return this.appToolkit.helpers.tokenBalanceHelper.getTokenBalances({
      address,
      appId: PICKLE_DEMO_DEFINITION.id,
      groupId: PICKLE_DEMO_DEFINITION.groups.jar.id,
      network: Network.ETHEREUM_MAINNET,
    });
  }

  async getFarmBalances(address: string) {
    return this.appToolkit.helpers.contractPositionBalanceHelper.getContractPositionBalances({
      address,
      appId: PICKLE_DEMO_DEFINITION.id,
      groupId: PICKLE_DEMO_DEFINITION.groups.jar.id,
      network: Network.ETHEREUM_MAINNET,
      resolveBalances: async ({ address, contractPosition, multicall }) => {
        // Resolve staked token and reward token from contract position object
        const stakedToken = contractPosition.tokens.find(isSupplied)!;
        const rewardToken = contractPosition.tokens.find(isClaimable)!;

        // Initiate ethers contract instance
        const contract = this.pickleDemoContractFactory.pickleGauge(contractPosition);

        // Resolve requested address' staked balance and earned balance
        const [stakedBalanceRaw, rewardBalanceRaw] = await Promise.all([
          multicall.wrap(contract).balanceOf(address),
          multicall.wrap(contract).earned(address),
        ]);

        // Drill the balance into the token object. Drill will push balance into the token tree
        // thereby showing user's exposure to underlying tokens of the token jar
        return [
          drillBalance(stakedToken, stakedBalanceRaw.toString()),
          drillBalance(rewardToken, rewardBalanceRaw.toString()),
        ];
      },
    });
  }

  async getBalances(address: string) {
    const [jarTokenBalances] = await Promise.all([this.getJarTokenBalances(address)]);

    return presentBalanceFetcherResponse([
      {
        label: 'Jars',
        assets: jarTokenBalances,
      },
    ]);
  }
}
