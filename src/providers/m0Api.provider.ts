import { MasterKeyApi } from 'api-link-aio';
import { ApiMasterKeyProvider } from 'node-labs/lib/providers/apiMasterKey.provider';

export class M0ApiProvider extends ApiMasterKeyProvider {
    static override baseUrl = process.env.M0_API;
    protected static override masterKey = process.env.M0_API_AUTH_MASTERKEY;
}

export class M0ApiProviderV2 extends MasterKeyApi {
    override baseUrl = process.env.M0_API;
    token = Buffer.from(process.env.M0_API_AUTH_MASTERKEY || '', 'utf8').toString('base64');
}
