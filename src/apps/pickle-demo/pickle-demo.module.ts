import { Module } from '@nestjs/common';

import { AbstractDynamicApp } from '~app/app.dynamic-module';

import { PickleDemoContractFactory } from './contracts';
import { EthereumPickleDemoBalanceFetcher } from './ethereum/pickle-demo.balance-fetcher';
import { EthereumPickleDemoFarmContractPositionFetcher } from './ethereum/pickle-demo.farm.contract-position-fetcher';
import { EthereumPickleDemoJarTokenFetcher } from './ethereum/pickle-demo.jar.token-fetcher';
import { PickleDemoAppDefinition } from './pickle-demo.definition';
import { PolygonPickleDemoBalanceFetcher } from './polygon/pickle-demo.balance-fetcher';
import { PolygonPickleDemoFarmContractPositionFetcher } from './polygon/pickle-demo.farm.contract-position-fetcher';
import { PolygonPickleDemoJarTokenFetcher } from './polygon/pickle-demo.jar.token-fetcher';

@Module({
  providers: [
    PickleDemoAppDefinition,
    PickleDemoContractFactory,
    EthereumPickleDemoBalanceFetcher,
    EthereumPickleDemoJarTokenFetcher,
    EthereumPickleDemoFarmContractPositionFetcher,
    PolygonPickleDemoBalanceFetcher,
    PolygonPickleDemoJarTokenFetcher,
    PolygonPickleDemoFarmContractPositionFetcher,
  ],
})
export class PickleDemoAppModule extends AbstractDynamicApp<PickleDemoAppModule>() {}
