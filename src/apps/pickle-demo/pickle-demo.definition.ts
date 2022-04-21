import { Register } from '~app-toolkit/decorators';
import { AppDefinition } from '~app/app.definition';
import { GroupType, ProtocolAction } from '~app/app.interface';
import { Network } from '~types/network.interface';

export const PICKLE_DEMO_DEFINITION = {
  id: 'pickle-demo',
  name: 'Pickle Demo',
  description: 'Demo tutorial on Zapper Studio',
  url: 'https://not.here/',
  groups: {
    jar: { id: 'jar', type: GroupType.TOKEN },
    farm: { id: 'farm', type: GroupType.POSITION },
  },
  tags: [],
  supportedNetworks: {
    [Network.ETHEREUM_MAINNET]: [ProtocolAction.VIEW],
    [Network.POLYGON_MAINNET]: [ProtocolAction.VIEW],
  },
  primaryColor: '#fff',
};

@Register.AppDefinition(PICKLE_DEMO_DEFINITION.id)
export class PickleDemoAppDefinition extends AppDefinition {
  constructor() {
    super(PICKLE_DEMO_DEFINITION);
  }
}

export default PICKLE_DEMO_DEFINITION;
