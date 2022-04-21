import { Inject } from '@nestjs/common';
import Axios from 'axios';

import { IAppToolkit, APP_TOOLKIT } from '~app-toolkit/app-toolkit.interface';
import { Register } from '~app-toolkit/decorators';
import { PositionFetcher } from '~position/position-fetcher.interface';
import { ContractPosition } from '~position/position.interface';
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
@Register.ContractPositionFetcher({ appId, groupId, network })
export class EthereumPickleDemoFarmContractPositionFetcher implements PositionFetcher<ContractPosition> {
  constructor(
    @Inject(APP_TOOLKIT) private readonly appToolkit: IAppToolkit,
    @Inject(PickleDemoContractFactory) private readonly pickleDemoContractFactory: PickleDemoContractFactory,
  ) {}

  async getPositions() {
    console.error('help');
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
    return [{ address: 'abc', stakedTokenAddress: 'bed', rewardTokenAddress: '123' }];
    return farmDefinitions as any;
  }
}
