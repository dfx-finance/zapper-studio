import { Injectable, Inject } from '@nestjs/common';

import { IAppToolkit, APP_TOOLKIT } from '~app-toolkit/app-toolkit.interface';
import { ContractFactory } from '~contract/contracts';
import { Network } from '~types/network.interface';

import { PickleGauge__factory } from './ethers';
import { PickleJar__factory } from './ethers';

// eslint-disable-next-line
type ContractOpts = { address: string; network: Network };

@Injectable()
export class PickleDemoContractFactory extends ContractFactory {
  constructor(@Inject(APP_TOOLKIT) protected readonly appToolkit: IAppToolkit) {
    super((network: Network) => appToolkit.getNetworkProvider(network));
  }

  pickleGauge({ address, network }: ContractOpts) {
    return PickleGauge__factory.connect(address, this.appToolkit.getNetworkProvider(network));
  }
  pickleJar({ address, network }: ContractOpts) {
    return PickleJar__factory.connect(address, this.appToolkit.getNetworkProvider(network));
  }
}

export type { PickleGauge } from './ethers';
export type { PickleJar } from './ethers';
