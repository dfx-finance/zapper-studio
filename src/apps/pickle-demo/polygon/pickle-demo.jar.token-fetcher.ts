import { Inject } from '@nestjs/common';

import { IAppToolkit, APP_TOOLKIT } from '~app-toolkit/app-toolkit.interface';
import { Register } from '~app-toolkit/decorators';
import { PositionFetcher } from '~position/position-fetcher.interface';
import { AppTokenPosition } from '~position/position.interface';
import { Network } from '~types/network.interface';

import { PickleDemoContractFactory } from '../contracts';
import { PICKLE_DEMO_DEFINITION } from '../pickle-demo.definition';

const appId = PICKLE_DEMO_DEFINITION.id;
const groupId = PICKLE_DEMO_DEFINITION.groups.jar.id;
const network = Network.POLYGON_MAINNET;

@Register.TokenPositionFetcher({ appId, groupId, network })
export class PolygonPickleDemoJarTokenFetcher implements PositionFetcher<AppTokenPosition> {
  constructor(
    @Inject(APP_TOOLKIT) private readonly appToolkit: IAppToolkit,
    @Inject(PickleDemoContractFactory) private readonly pickleDemoContractFactory: PickleDemoContractFactory,
  ) {}

  async getPositions() {
    return [];
  }
}
