import { ApiMasterKeyProvider } from 'node-common/dist/providers/apiMasterKey.provider';

export class M0ApiProvider extends ApiMasterKeyProvider {
    static baseUrl = process.env.M0_API;
    protected static masterKey = process.env.M0_API_AUTH_MASTERKEY;
}
