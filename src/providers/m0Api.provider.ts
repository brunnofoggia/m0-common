import { ApiMasterKeyProvider } from 'node-labs/lib/providers/apiMasterKey.provider';

export class M0ApiProvider extends ApiMasterKeyProvider {
    static override baseUrl = process.env.M0_API;
    protected static override masterKey = process.env.M0_API_AUTH_MASTERKEY;
}
